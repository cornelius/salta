import { describe, expect, it } from 'vitest'
import { movesRemaining } from './distance'
import { availableMoves, newGame, play, TOURNAMENT_MOVE_LIMIT } from './game'
import { legalMoves } from './rules'
import { opponent } from './types'

/** Deterministic generator, so a failing playout is reproducible from its seed. */
function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * Whole games driven by random legal play. These do not assert any particular
 * rule; they assert that the state machine cannot get into a state it has no
 * answer for -- no throw, no position with nothing to play, no game that never
 * ends -- which unit tests over hand-built positions cannot reach.
 */
describe('random playouts', () => {
  it('finish under the tournament rule, every time', () => {
    for (let seed = 1; seed <= 24; seed++) {
      const next = random(seed)
      let state = newGame({ tournament: true })
      let plies = 0
      while (state.outcome === undefined) {
        const moves = legalMoves(state.position, state.toMove)
        expect(
          moves.length,
          `seed ${seed} left ${state.toMove} with nothing to play`,
        ).toBeGreaterThan(0)
        const move = moves[Math.floor(next() * moves.length)]
        if (move === undefined) throw new Error('no move drawn')
        state = play(state, move.from, move.to)
        plies++
        expect(plies, `seed ${seed} ran past the move limit`).toBeLessThanOrEqual(
          TOURNAMENT_MOVE_LIMIT * 2 + 2,
        )
      }
      expect(['home', 'limit', 'draw']).toContain(state.outcome.kind)
    }
  })

  it('never lose or duplicate a piece', () => {
    const next = random(99)
    let state = newGame({ tournament: true })
    while (state.outcome === undefined) {
      expect(state.position.size).toBe(30)
      const moves = availableMoves(state)
      const move = moves[Math.floor(next() * moves.length)]
      if (move === undefined) throw new Error('no move drawn')
      state = play(state, move.from, move.to)
    }
    expect(state.position.size).toBe(30)
  })

  it('score the loser at least as far from home as the winner', () => {
    const next = random(7)
    let state = newGame({ tournament: true })
    while (state.outcome === undefined) {
      const moves = legalMoves(state.position, state.toMove)
      const move = moves[Math.floor(next() * moves.length)]
      if (move === undefined) throw new Error('no move drawn')
      state = play(state, move.from, move.to)
    }
    if (state.outcome.kind === 'draw') return
    const winner = state.outcome.winner
    expect(movesRemaining(state.position, winner)).toBeLessThanOrEqual(
      movesRemaining(state.position, opponent(winner)),
    )
  })
})
