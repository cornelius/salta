import type { Player, Square } from './types'

export const SIZE = 10
export const SQUARES = SIZE * SIZE

export function row(square: Square): number {
  return Math.floor(square / SIZE)
}

export function col(square: Square): number {
  return square % SIZE
}

export function square(r: number, c: number): Square {
  return r * SIZE + c
}

export function onBoard(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
}

/**
 * Play happens on the dark squares only ("Das ganze Spiel bewegt sich nur auf
 * den schwarzen Feldern"). Square (0,0) is light, so dark squares are the ones
 * whose coordinates sum to an odd number.
 */
export function isPlayable(sq: Square): boolean {
  return (row(sq) + col(sq)) % 2 === 1
}

export const PLAYABLE_SQUARES: readonly Square[] = Array.from(
  { length: SQUARES },
  (_, i) => i,
).filter(isPlayable)

/** Direction of advance along the row axis: green marches up the board, red down. */
export function forward(player: Player): -1 | 1 {
  return player === 'green' ? -1 : 1
}

/** The row a player starts against, and the far row they are marching toward. */
export function homeRow(player: Player): number {
  return player === 'green' ? SIZE - 1 : 0
}

export function farRow(player: Player): number {
  return SIZE - 1 - homeRow(player)
}

/**
 * The playable squares of one row, ordered left to right from `player`'s own
 * seat. Green sits at the bottom and reads columns left to right; red sits
 * opposite and reads them the other way. Piece ranks 1..5 occupy these in order,
 * which is what "in der Reihenfolge 1-5 von links" fixes.
 */
export function rowSquaresFromLeft(r: number, player: Player): Square[] {
  const squares: Square[] = []
  for (let c = 0; c < SIZE; c++) {
    const sq = square(r, c)
    if (isPlayable(sq)) squares.push(sq)
  }
  return player === 'green' ? squares : squares.reverse()
}

/** The four diagonal neighbours of a square that lie on the board. */
export function diagonalNeighbours(sq: Square): Square[] {
  const r = row(sq)
  const c = col(sq)
  const out: Square[] = []
  for (const dr of [-1, 1]) {
    for (const dc of [-1, 1]) {
      if (onBoard(r + dr, c + dc)) out.push(square(r + dr, c + dc))
    }
  }
  return out
}

/** Human-readable square name, columns a..j and rows 1..10 counted from green's edge. */
export function squareName(sq: Square): string {
  return `${'abcdefghij'[col(sq)]}${SIZE - row(sq)}`
}
