import type { Player } from '../core/types'

/**
 * Colours read off assets/photos/, not chosen. dev/tools/measure-pigment.py
 * derives them and explains the method; it is what to re-run if better
 * photographs of the set turn up.
 *
 * Two values here are not straight readings, and both are noted in that tool:
 * the board tints sit a shade above the medians it prints, because the board is
 * a folded sheet that lies unevenly; and the device colour is the bare card with
 * the neighbouring red pigment's bleed taken out of it. The devices were never
 * printed in white -- they are simply where no pigment was laid down, which on a
 * 125-year-old piece reads warm.
 */
export const PIGMENT: Record<Player, string> = {
  red: '#d81a25',
  green: '#33734d',
}

export const CARD = '#f4ead9'

/** Ink and paper of the printed rules sheet, for the engraved diagrams. */
export const PRINT = {
  ink: '#20222b',
  paper: '#e9e6dd',
} as const

/**
 * How a board and its pieces are inked. The game renders the set as it looks in
 * the hand; the rules facsimile renders the same geometry as the 1899 sheet
 * printed it, in one ink on paper. Both go through the same drawing code, so a
 * change to the artwork cannot leave the two out of step.
 */
export interface Palette {
  readonly boardLight: string
  readonly boardDark: string
  readonly frame: string
  readonly rule: string
  /** Face of a piece. */
  readonly disc: (player: Player) => string
  readonly discStroke: string
  readonly discStrokeWidth: number
  /** The devices printed on the face. */
  readonly device: string
  /** The gaps inside a device, such as the moon's eye and mouth. */
  readonly deviceHole: (player: Player) => string
}

export const SET_PALETTE: Palette = {
  boardLight: '#c2b094',
  boardDark: '#403845',
  frame: '#372f3c',
  rule: '#c2b094',
  disc: (player) => PIGMENT[player],
  discStroke: CARD,
  discStrokeWidth: 1.5,
  device: CARD,
  deviceHole: (player) => PIGMENT[player],
}

export const PRINT_PALETTE: Palette = {
  boardLight: PRINT.paper,
  boardDark: PRINT.ink,
  frame: PRINT.ink,
  rule: PRINT.paper,
  disc: () => PRINT.paper,
  discStroke: PRINT.ink,
  discStrokeWidth: 4,
  device: PRINT.ink,
  deviceHole: () => PRINT.paper,
}
