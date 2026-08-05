import type { Device, Piece, Rank } from '../core/types'
import { moonFacePaths, moonPath, starPath, sunPath, VIEW_BOX_SIZE } from './symbols'
import { type Palette, SET_PALETTE } from './theme'

/** Pieces are drawn in a 100x100 box, disc centred on (50,50). */
export const PIECE_SIZE = VIEW_BOX_SIZE
const DISC_RADIUS = 47

/**
 * How the devices sit on the face: one in the middle, more than one spread round
 * a ring, as on the pieces themselves. Ring radius and device size are tuned per
 * count so five still read as five without the outermost overlapping a neighbour
 * or spilling off the disc.
 */
const LAYOUT: Record<Rank, { readonly ring: number; readonly size: number }> = {
  1: { ring: 0, size: 40 },
  2: { ring: 24, size: 38 },
  3: { ring: 25, size: 36 },
  4: { ring: 26, size: 33 },
  5: { ring: 26, size: 30 },
}

/**
 * A small fixed spin per device, so a piece looks stamped by hand rather than
 * laid out by a machine -- the original's devices all sit at slightly different
 * angles. Derived from the piece's own identity, so a given piece always looks
 * the same.
 */
function spin(device: Device, rank: Rank, index: number): number {
  const seed = device.length * 37 + rank * 61 + index * 97
  return (((seed * 2654435761) % 360) / 360) * 48 - 24
}

function devicePaths(device: Device): {
  readonly solid: readonly string[]
  readonly holes: readonly string[]
} {
  switch (device) {
    case 'sun':
      return { solid: [sunPath()], holes: [] }
    case 'star':
      return { solid: [starPath()], holes: [] }
    case 'moon':
      return { solid: [moonPath()], holes: moonFacePaths() }
  }
}

function deviceMarkup(
  piece: Piece,
  palette: Palette,
  index: number,
  x: number,
  y: number,
  size: number,
): string {
  const { solid, holes } = devicePaths(piece.device)
  const scale = size / VIEW_BOX_SIZE
  const angle = spin(piece.device, piece.rank, index)
  const transform =
    `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)})` +
    ` scale(${scale.toFixed(4)}) translate(${-VIEW_BOX_SIZE / 2} ${-VIEW_BOX_SIZE / 2})`
  const shapes = [
    ...solid.map((d) => `<path d="${d}" fill="${palette.device}"/>`),
    ...holes.map((d) => `<path d="${d}" fill="${palette.deviceHole(piece.player)}"/>`),
  ]
  return `<g transform="${transform}">${shapes.join('')}</g>`
}

/** The devices of one piece, laid out on its face. */
function deviceLayoutMarkup(piece: Piece, palette: Palette = SET_PALETTE): string {
  const layout = LAYOUT[piece.rank]
  const out: string[] = []
  for (let i = 0; i < piece.rank; i++) {
    if (layout.ring === 0) {
      out.push(deviceMarkup(piece, palette, i, 50, 50, layout.size))
      continue
    }
    const angle = ((-90 + (360 / piece.rank) * i + piece.rank * 7) * Math.PI) / 180
    out.push(
      deviceMarkup(
        piece,
        palette,
        i,
        50 + layout.ring * Math.cos(angle),
        50 + layout.ring * Math.sin(angle),
        layout.size,
      ),
    )
  }
  return out.join('')
}

/** A whole piece: the disc and its devices, ready to be positioned. */
export function pieceMarkup(piece: Piece, palette: Palette = SET_PALETTE): string {
  return (
    `<circle cx="50" cy="50" r="${DISC_RADIUS}" fill="${palette.disc(piece.player)}"/>` +
    `<circle cx="50" cy="50" r="${DISC_RADIUS}" fill="none" stroke="${palette.discStroke}" ` +
    `stroke-width="${palette.discStrokeWidth}" stroke-opacity="0.55"/>` +
    deviceLayoutMarkup(piece, palette)
  )
}
