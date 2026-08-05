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
