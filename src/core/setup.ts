import { farRow, forward, homeRow, rowSquaresFromLeft } from './board'
import { DEVICES, type Device, type Piece, PLAYERS, type Player, RANKS, type Square } from './types'

/**
 * A position: which piece stands on which square. Squares with no entry are empty.
 * Kept as a plain Map so positions are cheap to copy and compare.
 */
export type Position = ReadonlyMap<Square, Piece>

/**
 * Where each device family stands in the marching column, counted from its head.
 * Suns lead, moons follow, stars bring up the rear: "in der I. Reihe befinden
 * sich die Sonnen, in der II. Reihe die Monde, in der III., dem Spieler
 * zugewandten Seite, die Sterne".
 */
const DEPTH_FROM_FRONT: Record<Device, number> = { sun: 0, moon: 1, star: 2 }

/** The row a device family occupies at the start: stars against the player's own edge. */
export function startRow(player: Player, device: Device): number {
  return homeRow(player) + forward(player) * (2 - DEPTH_FROM_FRONT[device])
}

/**
 * The row a device family must reach. The column crosses the board and packs
 * against the far edge in the order it set out in, which is what "in derselben
 * Schlachtordnung stehen wie anfangs" requires: suns still leading, stars still
 * at the back.
 */
export function targetRow(player: Player, device: Device): number {
  return farRow(player) - forward(player) * DEPTH_FROM_FRONT[device]
}

function formation(player: Player, rowOf: (device: Device) => number): Map<Square, Piece> {
  const out = new Map<Square, Piece>()
  for (const device of DEVICES) {
    const squares = rowSquaresFromLeft(rowOf(device), player)
    for (const rank of RANKS) {
      const sq = squares[rank - 1]
      if (sq === undefined) throw new Error(`no square for ${player} ${device} ${rank}`)
      out.set(sq, { player, device, rank })
    }
  }
  return out
}

/** The opening position of both sides, as drawn in the Anfangsstellung diagram. */
export function initialPosition(): Position {
  const out = new Map<Square, Piece>()
  for (const player of PLAYERS) {
    for (const [sq, piece] of formation(player, (d) => startRow(player, d))) out.set(sq, piece)
  }
  return out
}

/** Where each of a player's pieces has to end up, keyed by square. */
export function targetFormation(player: Player): ReadonlyMap<Square, Piece> {
  return formation(player, (d) => targetRow(player, d))
}

/** The square a specific piece has to reach. */
export function targetSquare(piece: Piece): Square {
  const squares = rowSquaresFromLeft(targetRow(piece.player, piece.device), piece.player)
  const sq = squares[piece.rank - 1]
  if (sq === undefined) throw new Error(`no target square for ${piece.player} ${piece.device}`)
  return sq
}
