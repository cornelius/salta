import { describe, expect, it } from 'vitest'
import { type GameState, newGame, play } from '../core/game'
import { findMove, legalMoves } from '../core/rules'
import { targetPosition } from '../core/setup'
import type { Piece, Player, Square } from '../core/types'
import { chooseMove, LEVELS, type Level, positionKey } from './opponent'

/** Deterministic generator, so a failing game is reproducible from its seed. */
function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * A whole game of the computer against itself, one strength per side, with
 * every chosen move checked against `legalMoves` -- which narrows to jumps when
 * one exists, so this also proves the computer takes every compulsory jump.
 */
function playout(green: Level, red: Level, seed: number): GameState {
  const rng = random(seed)
  const seen = new Map<string, number>()
  let state = newGame({ tournament: true })
  while (state.outcome === undefined) {
    const key = positionKey(state.position)
    seen.set(key, (seen.get(key) ?? 0) + 1)
    const level = state.toMove === 'green' ? green : red
    const move = chooseMove(state, level, rng, seen)
    expect(
      findMove(legalMoves(state.position, state.toMove), move.from, move.to),
      `seed ${seed}: ${state.toMove} chose an illegal ${move.from} -> ${move.to}`,
    ).toBeDefined()
    state = play(state, move.from, move.to)
  }
  return state
}

describe('chooseMove', () => {
  it('brings the last piece home, at any strength', () => {
    // Both sides stand finished except green's one-star, one step short.
    const position = new Map<Square, Piece>(targetPosition())
    const star = position.get(21)
    if (star === undefined) throw new Error('no green star on its target square')
    position.delete(21)
    position.set(30, star)
    const state: GameState = {
      position,
      toMove: 'green',
      moveCount: { green: 0, red: 0 },
      missedJump: undefined,
      mustJump: false,
      outcome: undefined,
      tournament: false,
    }
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 5; seed++) {
        expect(chooseMove(state, level, random(seed))).toMatchObject({ from: 30, to: 21 })
      }
    }
  })

  it('stays legal all game, and wins with lookahead against greed', () => {
    for (const [green, red, seed] of [
      ['medium', 'easy', 3],
      ['easy', 'medium', 1],
    ] as const) {
      const finished = playout(green, red, seed)
      const stronger: Player = green === 'medium' ? 'green' : 'red'
      expect(finished.outcome, `seed ${seed}`).toMatchObject({ winner: stronger })
    }
  }, 60_000)
})
