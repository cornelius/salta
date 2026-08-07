// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { square } from '../core/board'
import { mount } from './app'

let root: HTMLElement

function clickSquare(sq: number): void {
  const target = root.querySelector(`[data-square="${sq}"]`)
  if (target === null) throw new Error(`no clickable element for square ${sq}`)
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function move(from: number, to: number): void {
  clickSquare(from)
  clickSquare(to)
}

function text(selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? ''
}

beforeEach(() => {
  // The display mode is remembered between visits; no test may inherit it.
  globalThis.localStorage?.removeItem('salta.copy')
  document.body.innerHTML = '<div id="app"></div>'
  root = document.querySelector<HTMLElement>('#app') as HTMLElement
  mount(root)
})

describe('the board', () => {
  it('shows both sides at their opening stations', () => {
    expect(root.querySelectorAll('[data-piece]')).toHaveLength(30)
  })

  it('opens with green to move', () => {
    expect(text('#turn')).toContain('Green')
  })
})

describe('picking a piece up', () => {
  it('marks it and offers its destinations', () => {
    clickSquare(square(7, 4))
    expect(root.querySelectorAll('.hint-selected')).toHaveLength(1)
    expect(root.querySelectorAll('.hint-move').length).toBeGreaterThan(0)
  })

  it('plays the move when the destination dot itself is clicked', () => {
    clickSquare(square(7, 4))
    const dot = root.querySelector('.hint-move')
    if (dot === null) throw new Error('no destination offered')
    dot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(root.querySelectorAll('.hint-selected')).toHaveLength(0)
    expect(text('#turn')).toContain('Red')
  })

  it('ignores a piece belonging to the other side', () => {
    clickSquare(square(2, 5))
    expect(root.querySelectorAll('.hint-selected')).toHaveLength(0)
  })

  it('clears the marks once the move is played', () => {
    move(square(7, 4), square(6, 5))
    expect(root.querySelectorAll('.hint-selected')).toHaveLength(0)
    expect(text('#turn')).toContain('Red')
  })
})

describe('overlooking a jump', () => {
  /** Walk into contact so that green has a jump and then plays somewhere else. */
  function reachOverlookedJump(): void {
    move(square(7, 4), square(6, 5))
    move(square(2, 5), square(3, 4))
    move(square(6, 5), square(5, 4))
    move(square(3, 4), square(4, 3))
    move(square(8, 3), square(7, 4))
  }

  it('keeps the Salta prompt closed while nothing has been overlooked', () => {
    move(square(7, 4), square(6, 5))
    expect(root.querySelector('#notice')?.getAttribute('data-open')).toBe('no')
  })

  it('opens the prompt naming the player who passed the jump up', () => {
    reachOverlookedJump()
    expect(root.querySelector('#notice')?.getAttribute('data-open')).toBe('yes')
    expect(text('#notice-text')).toContain('Green')
  })

  it('sends the offender back when Salta is called', () => {
    reachOverlookedJump()
    root.querySelector<HTMLButtonElement>('#salta-call')?.click()
    expect(text('#turn')).toBe('Green must jump')
    expect(root.querySelector('#notice')?.getAttribute('data-open')).toBe('no')
  })

  it('lets the move stand when the call is waived', () => {
    reachOverlookedJump()
    root.querySelector<HTMLButtonElement>('#salta-waive')?.click()
    expect(text('#turn')).toContain('Red')
    expect(root.querySelector('#notice')?.getAttribute('data-open')).toBe('no')
  })
})

describe('the counts', () => {
  it('leaves out what each side still owes until it counts for something', () => {
    expect(text('#status')).not.toContain('Moves still to go')
    const tournament = root.querySelector<HTMLInputElement>('#tournament')
    if (tournament === null) throw new Error('no tournament control')
    tournament.checked = true
    tournament.dispatchEvent(new Event('change', { bubbles: true }))
    expect(text('#status')).toContain('Moves still to go')
  })
})

describe("grandma's copy", () => {
  function toggleCopy(): void {
    const box = root.querySelector<HTMLInputElement>('#copy')
    if (box === null) throw new Error('no control for the copy in hand')
    box.checked = true
    box.dispatchEvent(new Event('change', { bubbles: true }))
  }

  it('leaves the owner marks off until asked for', () => {
    expect(root.querySelectorAll('.owner-marks')).toHaveLength(0)
  })

  it('rules the owner rectangle onto the board', () => {
    toggleCopy()
    expect(root.querySelectorAll('.owner-marks rect')).toHaveLength(2)
  })

  it('draws the two lost pieces on card, and leaves the rest printed', () => {
    toggleCopy()
    const isCard = (id: string) => root.querySelector(`[data-piece="${id}"] .cut-card`) !== null
    expect(isCard('green-sun-1')).toBe(true)
    expect(isCard('green-sun-3')).toBe(true)
    expect(isCard('green-sun-2')).toBe(false)
    expect(root.querySelectorAll('[data-piece]')).toHaveLength(30)
  })

  it('keeps a replacement readable as the piece it stands in for', () => {
    toggleCopy()
    const replacement = root.querySelector('[data-piece="green-sun-3"]')
    expect(replacement?.getAttribute('aria-label')).toContain('sun 3')
    // Three devices drawn on, as on the piece it replaces: rim, edge, and three.
    expect(replacement?.querySelectorAll('path')).toHaveLength(5)
  })
})

describe('the language switch', () => {
  it('redraws the page in German without losing the board', () => {
    const select = root.querySelector<HTMLSelectElement>('#locale')
    if (select === null) throw new Error('no language control')
    select.value = 'de'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(text('#turn')).toBe('Grün ist am Zug')
    expect(root.querySelectorAll('[data-piece]')).toHaveLength(30)
  })
})
