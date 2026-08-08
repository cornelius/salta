import { movesRemaining, stepsBetween } from '../core/distance'
import type { GameState } from '../core/game'
import { applyMove, legalMoves } from '../core/rules'
import type { Position } from '../core/setup'
import { targetSquare } from '../core/setup'
import { type Move, opponent, type Player } from '../core/types'

/**
 * The computer opponent. It reasons with `legalMoves` and nothing wider: it
 * never overlooks a compulsory jump, and the interface has it call "Salta" on
 * every jump the human overlooks, because both halves of rule 3 are duties
 * (ADR 006). This module imports only `src/core`.
 */

export type Level = 'easy' | 'medium' | 'hard'
export const LEVELS: readonly Level[] = ['easy', 'medium', 'hard']

/**
 * How many plies each strength looks ahead. One ply is pure greed: always the
 * move that gains the most ground, blind to what it offers the opponent, which
 * is exactly the player the rules sheet's "Springenlassen" tactics punish.
 */
const DEPTH: Record<Level, number> = { easy: 1, medium: 3, hard: 5 }

/** Source of randomness, injectable so games are reproducible under test. */
export type Rng = () => number

/** Outranks any margin the evaluation can reach (a side owes at most ~15 * 18 steps). */
const WIN = 10_000

/**
 * The margin the game itself scores: how many moves the opponent still owes
 * beyond one's own. This is the quantity a finished game and the tournament
 * limit both count in points, so making it the evaluation means every strength
 * is playing for the printed stakes and nothing invented.
 */
function evaluate(position: Position, player: Player): number {
  return movesRemaining(position, opponent(player)) - movesRemaining(position, player)
}

/** How much nearer its target the moved piece ends up. Orders the search best-first. */
function progress(position: Position, move: Move): number {
  const piece = position.get(move.from)
  if (piece === undefined) return 0
  const target = targetSquare(piece)
  return stepsBetween(move.from, target) - stepsBetween(move.to, target)
}

/**
 * Plain alpha-beta minimax over `legalMoves`, scored for `player`. Both sides
 * are assumed to jump when they must; the omission the interface allows a human
 * is not in the computer's tree.
 */
function search(
  position: Position,
  toMove: Player,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  if (depth === 0) return evaluate(position, player)
  const moves = legalMoves(position, toMove)
  if (moves.length === 0) {
    // Walled in. The game hands the turn back (skipIfStuck); passing costs no ply.
    if (legalMoves(position, opponent(toMove)).length === 0) return evaluate(position, player)
    return search(position, opponent(toMove), player, depth, alpha, beta)
  }
  moves.sort((a, b) => progress(position, b) - progress(position, a))
  const maximizing = toMove === player
  let best = maximizing ? -Infinity : Infinity
  for (const move of moves) {
    const next = applyMove(position, move)
    const score =
      movesRemaining(next, toMove) === 0
        ? toMove === player
          ? WIN + depth
          : -(WIN + depth)
        : search(next, opponent(toMove), player, depth - 1, alpha, beta)
    if (maximizing) {
      if (score > best) best = score
      if (best > alpha) alpha = best
    } else {
      if (score < best) best = score
      if (best < beta) beta = best
    }
    if (beta <= alpha) break
  }
  return best
}

function shuffled(moves: readonly Move[], rng: Rng): Move[] {
  const out = [...moves]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i] as Move
    out[i] = out[j] as Move
    out[j] = swap
  }
  return out
}

/**
 * The move the computer plays. Equal-best moves are decided by the shuffle
 * underneath the stable sort, so two games at the same strength do not replay
 * each other move for move.
 */
export function chooseMove(state: GameState, level: Level, rng: Rng = Math.random): Move {
  const player = state.toMove
  const moves = shuffled(legalMoves(state.position, player), rng)
  moves.sort((a, b) => progress(state.position, b) - progress(state.position, a))
  let best = moves[0]
  if (best === undefined) throw new Error(`no legal move for ${player}`)
  let alpha = -Infinity
  for (const move of moves) {
    const next = applyMove(state.position, move)
    const score =
      movesRemaining(next, player) === 0
        ? WIN + DEPTH[level]
        : search(next, opponent(player), player, DEPTH[level] - 1, alpha, Infinity)
    if (score > alpha) {
      alpha = score
      best = move
    }
  }
  return best
}
