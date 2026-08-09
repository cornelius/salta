import { describe, expect, it } from 'vitest'
import { type GameState, play } from '../core/game'
import type { Piece, Player, Square } from '../core/types'
import { chooseMove, positionKey } from './opponent'

function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function side(
  player: Player,
  device: 'sun' | 'moon' | 'star',
  squares: number[],
): [Square, Piece][] {
  return squares.map((sq, i) => [sq, { player, device, rank: (i + 1) as Piece['rank'] }])
}

describe('a wedged endgame', () => {
  it('gets opened up rather than shuffled in', () => {
    // Both sides have parked their moons on their targets while the suns are
    // still outside, and a sun only reaches its row through the moons' -- the
    // wedge the computer once shuffled in front of without ever opening it.
    const position = new Map<Square, Piece>([
      ...side('green', 'moon', [10, 12, 14, 16, 18]),
      ...side('green', 'sun', [30, 32, 34, 36, 38]),
      ...side('green', 'star', [41, 43, 45, 47, 49]),
      ...side('red', 'sun', [69, 67, 65, 63, 61]),
      ...side('red', 'star', [58, 56, 54, 52, 50]),
      ...side('red', 'moon', [89, 87, 85, 83, 81]),
    ])
    let state: GameState = {
      position,
      toMove: 'green',
      moveCount: { green: 0, red: 0 },
      missedJump: undefined,
      mustJump: false,
      outcome: undefined,
      tournament: false,
    }
    const rng = random(1)
    const seen = new Map<string, number>()
    let plies = 0
    while (state.outcome === undefined && plies < 250) {
      const key = positionKey(state.position)
      seen.set(key, (seen.get(key) ?? 0) + 1)
      const move = chooseMove(state, 'medium', rng, seen)
      state = play(state, move.from, move.to)
      plies++
    }
    expect(state.outcome, `still unfinished after ${plies} plies`).toBeDefined()
    // Real searches on every move: the slowest test here, and worth its seconds.
  }, 60_000)
})
