import { describe, expect, it } from 'vitest'
import { col, isPlayable, PLAYABLE_SQUARES, row, square, squareName } from './board'
import { initialPosition, targetFormation, targetSquare } from './setup'
import { DEVICES, type Device, PLAYERS, type Player, pieceId, RANKS } from './types'

/**
 * Read a diagram row the way the printed Anfangsstellung is read: the pieces of
 * one row, listed left to right as they appear on the page, as `device+rank`.
 */
function diagramRow(position: ReturnType<typeof initialPosition>, r: number): string[] {
  const out: string[] = []
  for (let c = 0; c < 10; c++) {
    const piece = position.get(square(r, c))
    if (piece !== undefined) out.push(`${piece.player} ${piece.device} ${piece.rank}`)
  }
  return out
}

describe('board geometry', () => {
  it('plays on half of the hundred squares', () => {
    expect(PLAYABLE_SQUARES).toHaveLength(50)
  })

  it('puts the playable squares on the dark diagonal', () => {
    expect(isPlayable(square(0, 0))).toBe(false)
    expect(isPlayable(square(0, 1))).toBe(true)
    expect(isPlayable(square(9, 0))).toBe(true)
  })

  it('names squares from green s edge', () => {
    expect(squareName(square(9, 0))).toBe('a1')
    expect(squareName(square(0, 9))).toBe('j10')
  })
})

describe('the opening position', () => {
  const position = initialPosition()

  it('gives each side fifteen pieces', () => {
    for (const player of PLAYERS) {
      const own = [...position.values()].filter((p) => p.player === player)
      expect(own).toHaveLength(15)
    }
  })

  it('gives every piece a distinct identity', () => {
    const ids = new Set([...position.values()].map(pieceId))
    expect(ids.size).toBe(30)
  })

  it('stands every piece on a dark square', () => {
    for (const sq of position.keys()) expect(isPlayable(sq)).toBe(true)
  })

  it('leaves the four middle rows empty', () => {
    for (const sq of position.keys()) expect([3, 4, 5, 6]).not.toContain(row(sq))
  })

  // The three rows on each side of the printed diagram, transcribed from
  // assets/photos/rules-front.jpg. Red sits at the top, so its ranks run 5..1
  // across the page; green sits at the bottom and reads 1..5.
  it('matches the printed Anfangsstellung, red s side', () => {
    expect(diagramRow(position, 0)).toEqual([
      'red star 5',
      'red star 4',
      'red star 3',
      'red star 2',
      'red star 1',
    ])
    expect(diagramRow(position, 1)).toEqual([
      'red moon 5',
      'red moon 4',
      'red moon 3',
      'red moon 2',
      'red moon 1',
    ])
    expect(diagramRow(position, 2)).toEqual([
      'red sun 5',
      'red sun 4',
      'red sun 3',
      'red sun 2',
      'red sun 1',
    ])
  })

  it('matches the printed Anfangsstellung, green s side', () => {
    expect(diagramRow(position, 7)).toEqual([
      'green sun 1',
      'green sun 2',
      'green sun 3',
      'green sun 4',
      'green sun 5',
    ])
    expect(diagramRow(position, 8)).toEqual([
      'green moon 1',
      'green moon 2',
      'green moon 3',
      'green moon 4',
      'green moon 5',
    ])
    expect(diagramRow(position, 9)).toEqual([
      'green star 1',
      'green star 2',
      'green star 3',
      'green star 4',
      'green star 5',
    ])
  })

  it('puts the suns in front, the moons behind them and the stars at the back', () => {
    const rowOf = (player: Player, device: Device): number => {
      const hit = [...position.entries()].find(
        ([, p]) => p.player === player && p.device === device && p.rank === 1,
      )
      if (hit === undefined) throw new Error('piece not placed')
      return row(hit[0])
    }
    expect([rowOf('green', 'sun'), rowOf('green', 'moon'), rowOf('green', 'star')]).toEqual([
      7, 8, 9,
    ])
    expect([rowOf('red', 'sun'), rowOf('red', 'moon'), rowOf('red', 'star')]).toEqual([2, 1, 0])
  })
})

describe('the target formation', () => {
  it('is the opponent s three rows, in the same battle order', () => {
    const green = targetFormation('green')
    expect(green.size).toBe(15)
    for (const sq of green.keys()) expect(row(sq)).toBeLessThanOrEqual(2)

    // Suns stay in front of the marching column, so they finish on row 0.
    const rowOf = (device: Device): number => {
      const hit = [...green.entries()].find(([, p]) => p.device === device && p.rank === 1)
      if (hit === undefined) throw new Error('target not placed')
      return row(hit[0])
    }
    expect([rowOf('sun'), rowOf('moon'), rowOf('star')]).toEqual([0, 1, 2])
  })

  it('numbers each target row 1..5 from its own player s left', () => {
    const green = targetFormation('green')
    const stars = [...green.entries()]
      .filter(([, p]) => p.device === 'star')
      .sort(([a], [b]) => col(a) - col(b))
      .map(([, p]) => p.rank)
    expect(stars).toEqual([1, 2, 3, 4, 5])

    const red = targetFormation('red')
    const redStars = [...red.entries()]
      .filter(([, p]) => p.device === 'star')
      .sort(([a], [b]) => col(a) - col(b))
      .map(([, p]) => p.rank)
    expect(redStars).toEqual([5, 4, 3, 2, 1])
  })

  it('sends every piece to a square no other piece claims', () => {
    const all = new Set<number>()
    for (const player of PLAYERS) {
      for (const device of DEVICES) {
        for (const rank of RANKS) all.add(targetSquare({ player, device, rank }))
      }
    }
    expect(all.size).toBe(30)
  })

  it('sends each side into the squares the other side started from', () => {
    const start = initialPosition()
    const startSquares = new Set([...start.keys()])
    for (const player of PLAYERS) {
      for (const sq of targetFormation(player).keys()) expect(startSquares.has(sq)).toBe(true)
    }
  })
})
