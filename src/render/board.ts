import { col, isPlayable, row, SIZE } from '../core/board'
import type { Position } from '../core/setup'
import type { Square } from '../core/types'
import { isReplacement, pieceMarkup, replacementMarkup } from './piece'
import type { OwnerMarks } from './theme'
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
  /** The maker's name in the margins. The rules diagrams print without it. */
  readonly showMakerMark?: boolean
  /** Given, the rectangle a later owner ruled onto this copy is drawn over the squares. */
  readonly marks?: OwnerMarks
}

/**
 * The owner's rectangle encloses the middle eight-by-eight squares -- a chess or
 * draughts board inside the ten-by-ten one -- so it stands one square in from
 * the playing field on every side. Its two lines abut, the red falling outside
 * the square boundary and the blue inside it, and each is between a sixteenth
 * and a fourteenth of a square wide where the photograph is measured across it.
 */
const RULED_INSET = 1
const RULED_WIDTH = 6

function ruledFrameMarkup(marks: OwnerMarks): string {
  const line = (colour: string, offset: number) => {
    const start = FRAME + RULED_INSET * CELL + offset
    const span = FIELD - 2 * RULED_INSET * CELL - 2 * offset
    return (
      `<rect x="${start}" y="${start}" width="${span}" height="${span}" fill="none" ` +
      `stroke="${colour}" stroke-width="${RULED_WIDTH}"/>`
    )
  }
  // Over the squares, so the clicks that pick pieces up still reach them.
  return (
    `<g class="owner-marks" pointer-events="none">` +
    `${line(marks.lineOuter, -RULED_WIDTH / 2)}${line(marks.lineInner, RULED_WIDTH / 2)}</g>`
  )
}

/**
 * The board as printed: a hundred squares in two tints inside a dark frame, with
 * the maker's "SALTA!" set into the margins the two players face, one the right
 * way up from each seat, as on the original. Static -- nothing here depends on
 * the position being played.
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

  const midX = FRAME + FIELD / 2
  // The far player reads their own copy of it, so that one stands on its head.
  const label = (y: number, flip: boolean) =>
    `<text x="${midX}" y="${y}" fill="${palette.rule}" font-size="20" letter-spacing="7" ` +
    `text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" ` +
    `transform="rotate(${flip ? 180 : 0} ${midX} ${y})">SALTA!</text>`

  return [
    `<rect width="${BOARD_SIZE}" height="${BOARD_SIZE}" fill="${palette.frame}"/>`,
    `<g class="board-squares">${squares.join('')}</g>`,
    ...(options.marks === undefined ? [] : [ruledFrameMarkup(options.marks)]),
    `<rect x="${FRAME - RULE * 2}" y="${FRAME - RULE * 2}" width="${FIELD + RULE * 4}" ` +
      `height="${FIELD + RULE * 4}" fill="none" stroke="${palette.rule}" stroke-width="${RULE}"/>`,
    ...(options.showMakerMark === false
      ? []
      : [label(FRAME / 2, true), label(BOARD_SIZE - FRAME / 2, false)]),
  ].join('')
}

/**
 * A board with a position standing on it, drawn once and done with: the figures
 * in the rules facsimile, the target the panel shows, the preview page. The game
 * itself does not use this -- there a piece is an element that keeps its identity
 * across moves, so that a move can be a slide rather than a redraw.
 *
 * Given the owner's marks, the pieces this copy has lost are drawn as the cards
 * that stand in for them, so a diagram of the copy is a diagram of the copy
 * throughout.
 */
export function diagramMarkup(position: Position, options: BoardOptions = {}): string {
  const palette = options.palette ?? SET_PALETTE
  const marks = options.marks
  const pieces = [...position].map(([sq, piece]) => {
    const { x, y } = squareOrigin(sq)
    const face =
      marks !== undefined && isReplacement(piece)
        ? replacementMarkup(piece, marks, palette)
        : pieceMarkup(piece, palette)
    return `<g transform="translate(${x} ${y})">${face}</g>`
  })
  return boardMarkup(options) + pieces.join('')
}
