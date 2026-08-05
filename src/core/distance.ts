import { diagonalNeighbours, PLAYABLE_SQUARES } from './board'
import { type Position, targetSquare } from './setup'
import type { Player, Square } from './types'

/**
 * Shortest diagonal step counts between every pair of playable squares on an
 * empty board, by breadth-first search from each square. Enemy pieces stop
 * counting as obstacles once the scoring phase begins ("Alsdann gelten die
 * feindlichen Steine nicht mehr als Hindernis"), so an empty board is the right
 * graph for it.
 */
const DISTANCES: ReadonlyMap<Square, ReadonlyMap<Square, number>> = buildDistances()

function buildDistances(): Map<Square, Map<Square, number>> {
  const all = new Map<Square, Map<Square, number>>()
  for (const source of PLAYABLE_SQUARES) {
    const seen = new Map<Square, number>([[source, 0]])
    const queue: Square[] = [source]
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head] as Square
      const depth = seen.get(current) as number
      for (const next of diagonalNeighbours(current)) {
        if (seen.has(next)) continue
        seen.set(next, depth + 1)
        queue.push(next)
      }
    }
    all.set(source, seen)
  }
  return all
}

export function stepsBetween(from: Square, to: Square): number {
  const distance = DISTANCES.get(from)?.get(to)
  if (distance === undefined) throw new Error(`no path from ${from} to ${to}`)
  return distance
}

/**
 * How many moves a player still owes to get every piece home, on a board where
 * nothing is in the way. This is the quantity the rules count in points, both
 * for a finished game ("soviel Points, als er noch allein Züge zu machen hat")
 * and at the tournament move limit.
 */
export function movesRemaining(position: Position, player: Player): number {
  let total = 0
  for (const [sq, piece] of position) {
    if (piece.player !== player) continue
    total += stepsBetween(sq, targetSquare(piece))
  }
  return total
}

export function hasFinished(position: Position, player: Player): boolean {
  return movesRemaining(position, player) === 0
}
