import { col, forward, onBoard, row, square } from './board'
import type { Position } from './setup'
import type { Move, Player, Square } from './types'

/**
 * Every jump available to `player`.
 *
 * A jump passes over an adjacent enemy piece onto the empty square directly
 * beyond it, and nothing is captured: "Es wird jedoch niemals ein Stein
 * fortgenommen." Only enemy pieces can be jumped, and only forwards, because
 * rule 4 rules out the backward jump while explicitly keeping the backward move.
 */
export function jumpsFor(position: Position, player: Player): Move[] {
  const out: Move[] = []
  const dr = forward(player)
  for (const [from, piece] of position) {
    if (piece.player !== player) continue
    const r = row(from)
    const c = col(from)
    for (const dc of [-1, 1] as const) {
      const over = onBoard(r + dr, c + dc) ? square(r + dr, c + dc) : undefined
      const to = onBoard(r + 2 * dr, c + 2 * dc) ? square(r + 2 * dr, c + 2 * dc) : undefined
      if (over === undefined || to === undefined) continue
      const jumped = position.get(over)
      if (jumped === undefined || jumped.player === player) continue
      if (position.has(to)) continue
      out.push({ from, to, over })
    }
  }
  return out
}

/** Every plain move available to `player`, ignoring whether a jump is compulsory. */
export function plainMovesFor(position: Position, player: Player): Move[] {
  const out: Move[] = []
  for (const [from, piece] of position) {
    if (piece.player !== player) continue
    const r = row(from)
    const c = col(from)
    for (const dr of [-1, 1] as const) {
      for (const dc of [-1, 1] as const) {
        if (!onBoard(r + dr, c + dc)) continue
        const to = square(r + dr, c + dc)
        if (!position.has(to)) out.push({ from, to })
      }
    }
  }
  return out
}

/**
 * The moves a player is entitled to make. A jump anywhere on the board forbids
 * every plain move ("Ich darf also nicht an einer anderen Stelle mit einem Steine
 * schieben, wenn ich irgendwo überspringen muß"), and only one jump may be taken
 * per turn -- chains are explicitly disallowed.
 */
export function legalMoves(position: Position, player: Player): Move[] {
  const jumps = jumpsFor(position, player)
  return jumps.length > 0 ? jumps : plainMovesFor(position, player)
}

/**
 * The moves the interface will let a player make. This is deliberately wider
 * than `legalMoves`: a player who overlooks a compulsory jump may play a plain
 * move, and it stands unless the opponent calls "Salta". Reproducing that is the
 * point of rule 3, so the omission has to be reachable.
 */
export function offerableMoves(position: Position, player: Player): Move[] {
  return [...jumpsFor(position, player), ...plainMovesFor(position, player)]
}

export function isJump(move: Move): boolean {
  return move.over !== undefined
}

export function findMove(moves: readonly Move[], from: Square, to: Square): Move | undefined {
  return moves.find((m) => m.from === from && m.to === to)
}

/** Apply a move, returning a new position. Jumps displace nothing. */
export function applyMove(position: Position, move: Move): Position {
  const piece = position.get(move.from)
  if (piece === undefined) throw new Error(`no piece on square ${move.from}`)
  const next = new Map(position)
  next.delete(move.from)
  next.set(move.to, piece)
  return next
}
