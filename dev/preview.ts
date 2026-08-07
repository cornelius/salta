/**
 * Every piece and the opening position, rendered side by side, for eyeballing
 * the redrawn artwork against the photographs in assets/photos/. Served by the
 * dev server at /dev/preview.html; not part of the game.
 */
import { initialPosition } from '../src/core/setup'
import { DEVICES, PLAYERS, RANKS } from '../src/core/types'
import { BOARD_SIZE, diagramMarkup } from '../src/render/board'
import { PIECE_SIZE, pieceMarkup } from '../src/render/piece'
import { OWNER_MARKS } from '../src/render/theme'

const swatches: string[] = []
for (const player of PLAYERS) {
  for (const device of DEVICES) {
    const row = RANKS.map(
      (rank) =>
        `<svg viewBox="0 0 ${PIECE_SIZE} ${PIECE_SIZE}" width="110" height="110">` +
        `${pieceMarkup({ player, device, rank })}</svg>`,
    )
    swatches.push(`<div class="row"><span>${player} ${device}</span>${row.join('')}</div>`)
  }
}

const board = (showCopy: boolean) =>
  `<svg viewBox="0 0 ${BOARD_SIZE} ${BOARD_SIZE}" width="660" height="660">` +
  `${diagramMarkup(initialPosition(), showCopy ? { marks: OWNER_MARKS } : {})}</svg>`

const target = document.querySelector('#preview')
if (target !== null) {
  target.innerHTML = `
    <h2>Pieces</h2>
    ${swatches.join('')}
    <h2>Opening position</h2>
    ${board(false)}
    <h2>The copy in hand</h2>
    ${board(true)}`
}
