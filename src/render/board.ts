import { col, isPlayable, row, SIZE } from '../core/board'
import type { Square } from '../core/types'
import { type Palette, SET_PALETTE } from './theme'

/** One square is 100 units, so a square index maps to coordinates by multiplying. */
export const CELL = 100
/** The printed frame around the playing field. */
const FRAME = 34
/** Hairline rule the original prints just inside the frame. */
const RULE = 3

export const FIELD = SIZE * CELL
export const BOARD_SIZE = FIELD + 2 * FRAME

export function squareOrigin(sq: Square): { readonly x: number; readonly y: number } {
  return { x: FRAME + col(sq) * CELL, y: FRAME + row(sq) * CELL }
}

export interface BoardOptions {
  readonly palette?: Palette
  /** The maker's name in the side margins. The rules diagrams print without it. */
  readonly showMakerMark?: boolean
}

/**
 * The board as printed: a hundred squares in two tints inside a dark frame, with
 * the maker's "SALTA!" set into the left and right margins as on the original.
 * Static -- nothing here depends on the position being played.
 */
export function boardMarkup(options: BoardOptions = {}): string {
  const palette = options.palette ?? SET_PALETTE
  const squares: string[] = []
  for (let sq = 0; sq < SIZE * SIZE; sq++) {
    const { x, y } = squareOrigin(sq)
    const fill = isPlayable(sq) ? palette.boardDark : palette.boardLight
    squares.push(
      `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${fill}" ` +
        `data-square="${sq}" data-row="${row(sq)}" data-col="${col(sq)}"/>`,
    )
  }

  const midY = FRAME + FIELD / 2
  const label = (x: number, flip: boolean) =>
    `<text x="${x}" y="${midY}" fill="${palette.rule}" font-size="20" letter-spacing="7" ` +
    `text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" ` +
    `transform="rotate(${flip ? 90 : -90} ${x} ${midY})">SALTA!</text>`

  return [
    `<rect width="${BOARD_SIZE}" height="${BOARD_SIZE}" fill="${palette.frame}"/>`,
    `<g class="board-squares">${squares.join('')}</g>`,
    `<rect x="${FRAME - RULE * 2}" y="${FRAME - RULE * 2}" width="${FIELD + RULE * 4}" ` +
      `height="${FIELD + RULE * 4}" fill="none" stroke="${palette.rule}" stroke-width="${RULE}"/>`,
    ...(options.showMakerMark === false
      ? []
      : [label(FRAME / 2, false), label(BOARD_SIZE - FRAME / 2, true)]),
  ].join('')
}
