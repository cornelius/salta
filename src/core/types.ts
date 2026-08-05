/** Core domain types. This module is pure data: no DOM, no rendering, no I/O. */

/**
 * The two sides. Green starts on the near edge (bottom of the board as drawn)
 * and advances toward row 0; red starts on the far edge and advances toward
 * row 9. The 1899 rules name the sides only as "green" and "red" and never say
 * which one occupies which edge, so the assignment here is ours (ADR 003).
 */
export type Player = 'green' | 'red'

/** The three device families printed on the pieces: sun, moon, star. */
export type Device = 'sun' | 'moon' | 'star'

/** How many copies of the device a piece carries. Also its position in its row. */
export type Rank = 1 | 2 | 3 | 4 | 5

export interface Piece {
  readonly player: Player
  readonly device: Device
  readonly rank: Rank
}

/** A square index, `row * 10 + col`, with row 0 at the top and col 0 at the left. */
export type Square = number

export interface Move {
  readonly from: Square
  readonly to: Square
  /** A jump passes over an opposing piece on this square. Plain moves omit it. */
  readonly over?: Square
}

export const PLAYERS: readonly Player[] = ['green', 'red']
export const DEVICES: readonly Device[] = ['sun', 'moon', 'star']
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5]

export function opponent(player: Player): Player {
  return player === 'green' ? 'red' : 'green'
}

/** Stable key for a piece, unique across both sides. */
export function pieceId(piece: Piece): string {
  return `${piece.player}-${piece.device}-${piece.rank}`
}
