import { type Device, type Piece, pieceId, type Rank } from '../core/types'
import { moonFacePaths, moonPath, starPath, sunPath, VIEW_BOX_SIZE } from './symbols'
import type { OwnerMarks } from './theme'
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
  crayon?: string,
): string {
  const { solid, holes } = devicePaths(piece.device)
  const scale = size / VIEW_BOX_SIZE
  const angle = spin(piece.device, piece.rank, index)
  const transform =
    `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)})` +
    ` scale(${scale.toFixed(4)}) translate(${-VIEW_BOX_SIZE / 2} ${-VIEW_BOX_SIZE / 2})`
  // Drawn by hand, a device is an outline: the shape is gone round once, not
  // filled in. Printed, it is the card left bare, and then the gaps within it
  // are the pigment showing through.
  const shapes =
    crayon === undefined
      ? [
          ...solid.map((d) => `<path d="${d}" fill="${palette.device}"/>`),
          ...holes.map((d) => `<path d="${d}" fill="${palette.deviceHole(piece.player)}"/>`),
        ]
      : solid.map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${crayon}" stroke-opacity="${CRAYON_COVERAGE}" ` +
            `stroke-width="${(CRAYON_LINE / scale).toFixed(2)}" stroke-linejoin="round"/>`,
        )
  return `<g transform="${transform}">${shapes.join('')}</g>`
}

/** The devices of one piece, laid out on its face. */
function deviceLayoutMarkup(piece: Piece, palette: Palette = SET_PALETTE, crayon?: string): string {
  const layout = LAYOUT[piece.rank]
  const out: string[] = []
  for (let i = 0; i < piece.rank; i++) {
    if (layout.ring === 0) {
      out.push(deviceMarkup(piece, palette, i, 50, 50, layout.size, crayon))
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
        crayon,
      ),
    )
  }
  return out.join('')
}

/**
 * The two pieces this copy no longer has, and plays with hand-drawn cards
 * instead. Counting the printed faces in assets/photos/pieces-all.jpg against the
 * thirty a set needs gives them: twenty-eight are there, red complete, green
 * missing the one-sun and the three-sun. The photograph does not show the drawing
 * on the two cards well enough to check that against, but the owner has (ADR 004
 * [the copy in hand]).
 */
const REPLACED: ReadonlySet<string> = new Set(['green-sun-1', 'green-sun-3'])

export function isReplacement(piece: Piece): boolean {
  return REPLACED.has(pieceId(piece))
}

/** Points around the cut rim, and how far it strays from a circle. */
const CUT_POINTS = 36
const CUT_WOBBLE = 0.022

/**
 * The outline of a disc cut round with scissors: a circle in intent, a few slow
 * lobes off it in fact. Fixed per piece, like the spin on a device above, so the
 * two replacements do not match each other and neither changes between renders.
 */
function cutRimPath(piece: Piece): string {
  const seed = pieceId(piece).length + piece.rank * 1.7
  const points: string[] = []
  for (let i = 0; i < CUT_POINTS; i++) {
    const angle = (2 * Math.PI * i) / CUT_POINTS
    const stray = Math.sin(3 * angle + seed) * 0.6 + Math.sin(5 * angle + seed * 2) * 0.4
    const radius = DISC_RADIUS * (1 + CUT_WOBBLE * stray)
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `${points.join('')}Z`
}

/**
 * The crayon a replacement's devices are drawn in: how wide its line runs across
 * the piece, whatever the device is scaled to, and how much of the card it takes.
 * The one photograph that shows the discs does not show the drawing, so there is
 * no reading to take and the owner's account is the source: outlines, in a colour
 * near what the piece should have been. Hence the piece's own measured pigment,
 * laid thin, and two numbers that are judgements.
 */
const CRAYON_LINE = 1.5
const CRAYON_COVERAGE = 0.85

/**
 * What is on the board in place of a lost piece: card cut round by hand, with the
 * piece's devices drawn on it rather than printed. It carries the same count in
 * the same arrangement, because that is what makes it usable as the piece.
 */
export function replacementMarkup(
  piece: Piece,
  marks: OwnerMarks,
  palette: Palette = SET_PALETTE,
): string {
  const rim = cutRimPath(piece)
  return (
    `<path class="cut-card" d="${rim}" fill="${marks.card}"/>` +
    `<path d="${rim}" fill="none" stroke="${marks.cardEdge}" stroke-width="2"/>` +
    deviceLayoutMarkup(piece, palette, palette.disc(piece.player))
  )
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
