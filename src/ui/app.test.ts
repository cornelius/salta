// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { square } from '../core/board'
import { squareOrigin } from '../render/board'
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
  // Language, display mode, opponent and colour are remembered between visits,
  // and so is the game itself; no test may inherit another's.
  globalThis.localStorage?.removeItem('salta.locale')
  globalThis.localStorage?.removeItem('salta.copy')
  globalThis.localStorage?.removeItem('salta.opponent')
  globalThis.localStorage?.removeItem('salta.side')
  globalThis.localStorage?.removeItem('salta.game')
  document.body.innerHTML = '<div id="app"></div>'
  root = document.querySelector<HTMLElement>('#app') as HTMLElement
  mount(root)
})

describe('the board', () => {
  it('shows both sides at their opening stations', () => {
    expect(root.querySelectorAll('[data-piece]')).toHaveLength(30)
  })

  it('shows what a finished board looks like, in the panel', () => {
    // Thirty pieces, and no way to click one: it is a figure, not a second board.
    expect(root.querySelectorAll('#target .target-board > g[transform]')).toHaveLength(30)
    expect(root.querySelectorAll('#target [data-piece]')).toHaveLength(0)
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
    expect(root.querySelectorAll('#board .owner-marks rect')).toHaveLength(2)
  })

  it('draws the figure in the panel the same way', () => {
    expect(root.querySelectorAll('#target .owner-marks')).toHaveLength(0)
    toggleCopy()
    expect(root.querySelectorAll('#target .owner-marks')).toHaveLength(1)
    expect(root.querySelectorAll('#target .cut-card')).toHaveLength(2)
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

describe('against the computer', () => {
  /** Deterministic generator, so the computer's replies are scripted too. */
  function random(seed: number): () => number {
    let state = seed >>> 0
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 0x100000000
    }
  }

  function setSelect(id: string, value: string): void {
    const select = root.querySelector<HTMLSelectElement>(id)
    if (select === null) throw new Error(`no control ${id}`)
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('answers the human move after a beat, and locks the board while owing one', () => {
    setSelect('#opponent', 'easy')
    move(square(7, 4), square(6, 5))
    // Red owes its move: the board takes no clicks and offers nothing.
    clickSquare(square(2, 5))
    expect(root.querySelectorAll('.hint-selected')).toHaveLength(0)
    expect(text('#turn')).toContain('Red')
    vi.advanceTimersByTime(700)
    expect(text('#turn')).toContain('Green')
  })

  it('opens the game itself when the human takes red', () => {
    setSelect('#opponent', 'easy')
    setSelect('#side', 'red')
    expect(text('#turn')).toContain('Green')
    vi.advanceTimersByTime(700)
    expect(text('#turn')).toContain('Red')
  })

  it('shows a human playing red the board from their own seat', () => {
    setSelect('#opponent', 'easy')
    setSelect('#side', 'red')
    // Red star one stands on square 9; seen from red's seat that is the near
    // left corner, where square 90 is drawn. The square it names must not move.
    const piece = root.querySelector('[data-piece="red-star-1"]')
    const { x, y } = squareOrigin(90)
    expect(piece?.getAttribute('data-square')).toBe('9')
    expect(piece?.getAttribute('transform')).toBe(`translate(${x} ${y})`)
  })

  /**
   * Clicks the printed square drawn where square `drawn` sits, whatever square
   * it names -- the board as the player points at it, rather than by the name
   * the mark carries.
   */
  function clickPrintedSquare(drawn: number): void {
    const { x, y } = squareOrigin(drawn)
    const rect = [...root.querySelectorAll('#printing [data-square]')].find(
      (element) =>
        element.getAttribute('x') === String(x) && element.getAttribute('y') === String(y),
    )
    if (rect === undefined) throw new Error(`nothing printed at square ${drawn}`)
    rect.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  it('takes a click anywhere on the square a human playing red moves to', () => {
    document.body.innerHTML = '<div id="app"></div>'
    root = document.querySelector<HTMLElement>('#app') as HTMLElement
    mount(root, { rng: random(42) })
    setSelect('#opponent', 'easy')
    setSelect('#side', 'red')
    vi.advanceTimersByTime(700)
    // Red's sun on 21 steps to 30. From red's seat those are drawn at the other
    // end of the board, and the click lands on the square, not on its dot.
    clickSquare(21)
    clickPrintedSquare(69)
    expect(root.querySelector('#pieces [data-square="30"]')).not.toBeNull()
  })

  it('keeps the Salta buttons out of a solo game', () => {
    setSelect('#opponent', 'easy')
    expect(root.querySelector('#salta-call')?.hasAttribute('hidden')).toBe(true)
    expect(root.querySelector('#salta-waive')?.hasAttribute('hidden')).toBe(true)
  })

  it('calls Salta itself when the human passes up a jump', () => {
    // Replayed with a fixed seed, so the easy opponent's moves are a script:
    // green walks its one-sun out to meet red, red comes to meet it, and after
    // four turns each the sun on 30 has red on 21 to jump. Green declines it by
    // stepping back to 41; the computer must send the sun back and demand the jump.
    document.body.innerHTML = '<div id="app"></div>'
    root = document.querySelector<HTMLElement>('#app') as HTMLElement
    mount(root, { rng: random(42) })
    setSelect('#opponent', 'easy')
    for (const [from, to] of [
      [70, 61],
      [61, 50],
      [50, 41],
      [41, 30],
    ]) {
      move(from as number, to as number)
      vi.advanceTimersByTime(700)
    }
    move(30, 41)
    vi.advanceTimersByTime(700)
    expect(text('#turn')).toBe('Green must jump')
    expect(text('#notice-text')).toContain('Salta')
    expect(root.querySelector('[data-piece="green-sun-1"]')?.getAttribute('data-square')).toBe('30')
  })
})

describe('giving up a game in progress', () => {
  function click(selector: string): void {
    const button = root.querySelector(selector)
    if (button === null) throw new Error(`no control ${selector}`)
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  function setSelect(id: string, value: string): void {
    const select = root.querySelector<HTMLSelectElement>(id)
    if (select === null) throw new Error(`no control ${id}`)
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const asking = () => root.querySelector('#notice')?.getAttribute('data-open') === 'yes'
  const moved = () => root.querySelector('#pieces [data-square="61"]') !== null

  it('starts over without a word when there is nothing to give up', () => {
    click('#new-game')
    expect(asking()).toBe(false)
    expect(text('#status')).toContain('0')
  })

  it('asks before the new game button throws a game away', () => {
    move(70, 61)
    click('#new-game')
    expect(asking()).toBe(true)
    // Asked, and nothing done yet: the piece is where the player left it.
    expect(moved()).toBe(true)
  })

  it('leaves the game standing when the player keeps playing', () => {
    move(70, 61)
    click('#new-game')
    click('#restart-keep')
    expect(asking()).toBe(false)
    expect(moved()).toBe(true)
  })

  it('starts the new game when the player says so', () => {
    move(70, 61)
    click('#new-game')
    click('#restart-start')
    expect(asking()).toBe(false)
    expect(moved()).toBe(false)
  })

  it('asks before a setting does, and holds the setting until it is answered', () => {
    move(70, 61)
    setSelect('#opponent', 'easy')
    expect(asking()).toBe(true)
    expect(moved()).toBe(true)
    // Two players still: the computer has not been let in, and owes no move.
    vi.useFakeTimers()
    vi.advanceTimersByTime(700)
    vi.useRealTimers()
    expect(moved()).toBe(true)
  })

  it('puts the control back when the setting is thought better of', () => {
    move(70, 61)
    setSelect('#opponent', 'easy')
    click('#restart-keep')
    expect(root.querySelector<HTMLSelectElement>('#opponent')?.value).toBe('human')
    expect(moved()).toBe(true)
  })

  it('takes the setting up with the new game it starts', () => {
    move(70, 61)
    setSelect('#opponent', 'easy')
    click('#restart-start')
    expect(root.querySelector<HTMLSelectElement>('#opponent')?.value).toBe('easy')
    expect(moved()).toBe(false)
  })

  it('leaves the language and the copy in hand alone: they end no game', () => {
    move(70, 61)
    const box = root.querySelector<HTMLInputElement>('#copy')
    if (box === null) throw new Error('no control for the copy in hand')
    box.checked = true
    box.dispatchEvent(new Event('change', { bubbles: true }))
    setSelect('#locale', 'de')
    expect(asking()).toBe(false)
    expect(moved()).toBe(true)
  })
})

describe('coming back to the page', () => {
  /** Opens the page again, as following the rules link and returning does. */
  function reopen(): void {
    document.body.innerHTML = '<div id="app"></div>'
    root = document.querySelector<HTMLElement>('#app') as HTMLElement
    mount(root)
  }

  it('finds the game standing where it was left', () => {
    move(70, 61)
    reopen()
    expect(root.querySelector('#pieces [data-square="61"]')).not.toBeNull()
    expect(text('#turn')).toContain('Red')
  })

  it('opens on a new board when the stored game cannot be read', () => {
    move(70, 61)
    globalThis.localStorage?.setItem('salta.game', '{ half a game')
    reopen()
    expect(root.querySelector('#pieces [data-square="61"]')).toBeNull()
    expect(text('#turn')).toContain('Green')
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
