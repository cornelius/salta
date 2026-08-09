// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { callSalta, newGame, play } from '../core/game'
import { loadGame, saveGame } from './saved'

const KEY = 'salta.game'

function stored(): Record<string, unknown> {
  const text = globalThis.localStorage?.getItem(KEY)
  if (text === null || text === undefined) throw new Error('nothing stored')
  return JSON.parse(text) as Record<string, unknown>
}

beforeEach(() => {
  globalThis.localStorage?.removeItem(KEY)
})

describe('the game kept between visits', () => {
  it('has nothing to give back before a game is stored', () => {
    expect(loadGame()).toBeUndefined()
  })

  it('gives back the position, whose turn it is, and what each side has played', () => {
    const state = play(newGame(), 70, 61)
    saveGame(state)
    const back = loadGame()
    expect(back?.toMove).toBe('red')
    expect(back?.moveCount).toEqual({ green: 1, red: 0 })
    expect([...(back?.position ?? [])]).toEqual([...state.position])
  })

  it('keeps the tournament rule with the game it governs', () => {
    saveGame(newGame({ tournament: true }))
    expect(loadGame()?.tournament).toBe(true)
  })

  it('keeps an overlooked jump, so the call can still be made after a reload', () => {
    // The two columns walk into each other, and then green, with a jump to take,
    // steps aside instead. The missed jump carries the position it was passed up
    // in, which is what a Salta call puts back.
    let state = newGame()
    for (const [from, to] of [
      [72, 63],
      [21, 32],
      [81, 72],
      [32, 43],
      [70, 61],
      [43, 52],
    ]) {
      state = play(state, from as number, to as number)
    }
    const missed = play(state, 74, 65)
    expect(missed.missedJump).toBeDefined()
    saveGame(missed)
    const back = loadGame()
    expect(back?.missedJump?.by).toBe('green')
    expect(back).toBeDefined()
    if (back === undefined) return
    // The stored game answers a call the same way the game in hand does.
    expect([...callSalta(back).position]).toEqual([...callSalta(missed).position])
  })

  it('drops a game it cannot read rather than opening on a board it cannot draw', () => {
    const cases: readonly string[] = [
      'not json at all',
      JSON.stringify({ version: 99, position: [] }),
      JSON.stringify({
        ...stashed(),
        position: [[70, { player: 'blue', device: 'sun', rank: 1 }]],
      }),
      JSON.stringify({
        ...stashed(),
        position: [[70, { player: 'green', device: 'sun', rank: 9 }]],
      }),
      JSON.stringify({
        ...stashed(),
        position: [[999, { player: 'green', device: 'sun', rank: 1 }]],
      }),
      JSON.stringify({ ...stashed(), toMove: 'purple' }),
      JSON.stringify({ ...stashed(), moveCount: { green: 1 } }),
      JSON.stringify({ ...stashed(), mustJump: 'yes' }),
      JSON.stringify({ ...stashed(), outcome: { kind: 'home', winner: 'green' } }),
      JSON.stringify({ ...stashed(), missedJump: { by: 'red' } }),
    ]
    for (const text of cases) {
      globalThis.localStorage?.setItem(KEY, text)
      expect(loadGame(), text.slice(0, 60)).toBeUndefined()
    }
  })

  /** A sound stored game to spoil one field of. */
  function stashed(): Record<string, unknown> {
    saveGame(newGame())
    return stored()
  }
})
