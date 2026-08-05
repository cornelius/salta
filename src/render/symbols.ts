/**
 * The three devices printed on the pieces, redrawn as SVG paths.
 *
 * Each is drawn in a 100x100 box centred on (50,50) so instances can be placed
 * with a single transform. Shapes were traced from the macro photographs in
 * assets/photos/; where the original is a repeating figure -- the sun's corona,
 * the star's points -- the geometry is computed rather than transcribed, so the
 * tooth count and proportions stay legible as the numbers they are.
 */

export const VIEW_BOX_SIZE = 100
const CENTRE = VIEW_BOX_SIZE / 2

function polar(angleDeg: number, radius: number): string {
  const a = (angleDeg * Math.PI) / 180
  return `${(CENTRE + radius * Math.cos(a)).toFixed(2)},${(CENTRE + radius * Math.sin(a)).toFixed(2)}`
}

/** Rays counted off the macro photograph of a single sun. */
const SUN_RAYS = 28
const SUN_CORE = 30
const SUN_TIP = 44

/**
 * A disc ringed by short blunt rays. Drawn as one closed polygon: the ray bases
 * sit on the core radius and approximate its circle, so no separate disc is
 * needed underneath.
 */
export function sunPath(): string {
  const step = 360 / SUN_RAYS
  const gap = step * 0.3
  const points: string[] = []
  for (let i = 0; i < SUN_RAYS; i++) {
    const a0 = i * step
    points.push(polar(a0, SUN_CORE), polar(a0 + gap, SUN_TIP), polar(a0 + step - gap, SUN_TIP))
  }
  return `M${points.join('L')}Z`
}

const STAR_POINTS = 5
const STAR_OUTER = 46
/** The printed star is a fat one; the waist sits a little under half the point radius. */
const STAR_INNER = 20

export function starPath(): string {
  const step = 360 / STAR_POINTS
  const points: string[] = []
  for (let i = 0; i < STAR_POINTS; i++) {
    points.push(polar(-90 + i * step, STAR_OUTER), polar(-90 + (i + 0.5) * step, STAR_INNER))
  }
  return `M${points.join('L')}Z`
}

/**
 * The moon: a little over half a disc, with the straight side cut into a face
 * looking right. The original stamp is barely a crescent -- the card shows
 * through from the left edge almost to the centre line -- and the nose and lips
 * are notches in that silhouette rather than marks drawn on top of it.
 */
export function moonPath(): string {
  return [
    'M52,9',
    // Outer edge: one sweep round the left, from the crown to the lower horn.
    'A42,42 0 1 0 62,88',
    // Profile, read upwards: jaw, chin, lips, nose, brow, forehead, crown.
    'C62,82 60,78 62,74',
    'C64,71 61,69 57,68',
    'C55,67 55,65 58,64',
    'C63,62 64,59 61,57',
    'C59,55 59,54 62,52',
    'C68,49 68,46 60,43',
    'C57,42 57,39 59,37',
    'C62,33 62,26 59,20',
    'C57,16 54,12 52,9',
    'Z',
  ].join(' ')
}

/**
 * The dark markings on the moon's face: eye, cheek, and mouth. These are gaps in
 * the print, so they take the piece colour rather than the card.
 */
export function moonFacePaths(): readonly string[] {
  return [
    // Eye: a broad almond set well back from the profile.
    'M34,28 C41,24 49,27 49,33 C48,38 41,39 36,36 C32,34 31,30 34,28 Z',
    // Cheek shadow beside the nose.
    'M45,50 C50,48 53,50 52,53 C50,56 46,56 44,54 C43,52 43,51 45,50 Z',
    // Mouth.
    'M41,63 C47,61 51,63 50,67 C48,70 43,70 41,67 C40,65 40,64 41,63 Z',
  ]
}
