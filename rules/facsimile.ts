/**
 * Draws the two board diagrams into the rules facsimile.
 *
 * They come out of the same code that draws the board in the game, inked for
 * paper instead of for the set, so the printed figures and the playable board
 * cannot drift apart. The opening figure is the real opening position; the final
 * figure is the one the 1899 sheet prints, with four of red's stars still adrift.
 */
import { square } from '../src/core/board'
import { initialPosition, type Position, targetSquare } from '../src/core/setup'
import { type Piece, PLAYERS, type Square } from '../src/core/types'
import { BOARD_SIZE, boardMarkup, squareOrigin } from '../src/render/board'
import { pieceMarkup } from '../src/render/piece'
import { PRINT_PALETTE } from '../src/render/theme'

/** The row labels the sheet prints beside each diagram, against the board edge. */
const ROW_LABELS: readonly [string, number][] = [
  ['I', 2],
  ['II', 1],
  ['III', 0],
]

/**
 * Fig. 2 as printed: green home in good order, red home except for four star
 * pieces still scattered in midfield. Their positions are read off
 * assets/photos/rules-front.jpg, and cost red the ten points the caption names.
 */
const STRANDED: readonly (readonly [number, number, Piece])[] = [
  [4, 3, { player: 'red', device: 'star', rank: 3 }],
  [4, 7, { player: 'red', device: 'star', rank: 2 }],
  [5, 0, { player: 'red', device: 'star', rank: 5 }],
  [5, 2, { player: 'red', device: 'star', rank: 4 }],
]

function finalPosition(): Position {
  const out = new Map<Square, Piece>()
  const stray = new Set(STRANDED.map(([, , piece]) => `${piece.device}${piece.rank}`))
  for (const [, piece] of initialPosition()) {
    if (piece.player === 'red' && piece.device === 'star' && stray.has(`star${piece.rank}`))
      continue
    out.set(targetSquare(piece), piece)
  }
  for (const [r, c, piece] of STRANDED) out.set(square(r, c), piece)
  return out
}

function diagram(position: Position): string {
  const pieces = [...position].map(([sq, piece]) => {
    const { x, y } = squareOrigin(sq)
    return `<g transform="translate(${x} ${y})">${pieceMarkup(piece, PRINT_PALETTE)}</g>`
  })
  return (
    `<svg viewBox="0 0 ${BOARD_SIZE} ${BOARD_SIZE}" class="plate" role="img" ` +
    `aria-label="Saltabrett mit Steinen">` +
    `${boardMarkup({ palette: PRINT_PALETTE, showMakerMark: false })}${pieces.join('')}</svg>`
  )
}

/**
 * The bracketed row numerals the sheet sets beside each diagram: I, II, III
 * counted outward from the middle of the board on each player's own side.
 */
function rowLabels(): string {
  const marks = (player: 'green' | 'red') =>
    ROW_LABELS.map(([numeral, depth]) => {
      const r = player === 'green' ? 7 + depth : 2 - depth
      return `<span class="row-label" style="grid-row:${r + 1}">${numeral}</span>`
    }).join('')
  return PLAYERS.map((p) => `<div class="row-labels row-labels-${p}">${marks(p)}</div>`).join('')
}

function draw(id: string, position: Position): void {
  const host = document.querySelector(`#${id}`)
  if (host !== null) host.innerHTML = rowLabels() + diagram(position)
}

draw('figure-opening', initialPosition())
draw('figure-final', finalPosition())
