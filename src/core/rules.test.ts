import { describe, expect, it } from 'vitest'
import { square } from './board'
import { movesRemaining, stepsBetween } from './distance'
import type { GameState } from './game'
import {
  availableMoves,
  callSalta,
  jumpIsCompulsory,
  newGame,
  play,
  TOURNAMENT_MOVE_LIMIT,
  waiveSalta,
} from './game'
import { jumpsFor, legalMoves, plainMovesFor } from './rules'
import type { Position } from './setup'
import { initialPosition, targetSquare } from './setup'
import type { Piece, Player, Square } from './types'

/** Build a sparse position from `[row, col, piece]` triples. */
function position(...placements: [number, number, Piece][]): Position {
  return new Map(placements.map(([r, c, piece]) => [square(r, c), piece]))
}

const greenSun = (rank: 1 | 2 | 3 | 4 | 5): Piece => ({ player: 'green', device: 'sun', rank })
const redSun = (rank: 1 | 2 | 3 | 4 | 5): Piece => ({ player: 'red', device: 'sun', rank })

function stateWith(pos: Position, toMove: Player = 'green'): GameState {
  return { ...newGame(), position: pos, toMove }
}

describe('moving', () => {
  it('goes one square diagonally, forwards or backwards', () => {
    const pos = position([5, 4, greenSun(1)])
    const destinations = plainMovesFor(pos, 'green')
      .map((m) => m.to)
      .sort((a, b) => a - b)
    expect(destinations).toEqual([square(4, 3), square(4, 5), square(6, 3), square(6, 5)])
  })

  it('cannot enter an occupied square', () => {
    const pos = position([5, 4, greenSun(1)], [4, 3, greenSun(2)], [4, 5, redSun(1)])
    const destinations = plainMovesFor(pos, 'green')
      .filter((m) => m.from === square(5, 4))
      .map((m) => m.to)
    expect(destinations).not.toContain(square(4, 3))
    expect(destinations).not.toContain(square(4, 5))
  })

  it('stays inside the board at the edges', () => {
    const pos = position([0, 1, greenSun(1)])
    expect(plainMovesFor(pos, 'green')).toHaveLength(2)
  })
})

describe('jumping', () => {
  it('hops an adjacent enemy onto the empty square beyond', () => {
    const pos = position([5, 4, greenSun(1)], [4, 5, redSun(1)])
    expect(jumpsFor(pos, 'green')).toEqual([
      { from: square(5, 4), to: square(3, 6), over: square(4, 5) },
    ])
  })

  it('leaves the jumped piece on the board', () => {
    const pos = position([5, 4, greenSun(1)], [4, 5, redSun(1)])
    const after = play(stateWith(pos), square(5, 4), square(3, 6)).position
    expect(after.get(square(4, 5))).toEqual(redSun(1))
    expect(after.size).toBe(2)
  })

  it('will not hop one of its own', () => {
    const pos = position([5, 4, greenSun(1)], [4, 5, greenSun(2)])
    expect(jumpsFor(pos, 'green')).toEqual([])
  })

  it('will not hop backwards, though a plain move backwards is fine', () => {
    const pos = position([5, 4, greenSun(1)], [6, 5, redSun(1)])
    expect(jumpsFor(pos, 'green')).toEqual([])
    expect(plainMovesFor(pos, 'green').map((m) => m.to)).toContain(square(6, 3))
  })

  it('needs the landing square free', () => {
    const pos = position([5, 4, greenSun(1)], [4, 5, redSun(1)], [3, 6, redSun(2)])
    expect(jumpsFor(pos, 'green')).toEqual([])
  })

  it('crowds out every plain move once one is available', () => {
    const pos = position([5, 4, greenSun(1)], [4, 5, redSun(1)], [8, 1, greenSun(2)])
    const moves = legalMoves(pos, 'green')
    expect(moves).toHaveLength(1)
    expect(moves[0]?.over).toBe(square(4, 5))
  })

  it('takes only one hop per turn, never a chain', () => {
    const pos = position([7, 2, greenSun(1)], [6, 3, redSun(1)], [4, 5, redSun(2)])
    const after = play(stateWith(pos), square(7, 2), square(5, 4))
    expect(after.toMove).toBe('red')
  })
})

describe('the Salta call', () => {
  const overlooked = () => {
    const pos = position([5, 4, greenSun(1)], [4, 5, redSun(1)], [8, 1, greenSun(2)])
    return play(stateWith(pos), square(8, 1), square(7, 0))
  }

  it('lets a player overlook a compulsory jump', () => {
    const state = stateWith(position([5, 4, greenSun(1)], [4, 5, redSun(1)], [8, 1, greenSun(2)]))
    expect(jumpIsCompulsory(state)).toBe(true)
    expect(availableMoves(state).map((m) => m.from)).toContain(square(8, 1))
  })

  it('opens a window for the opponent to call it', () => {
    const after = overlooked()
    expect(after.missedJump?.by).toBe('green')
    expect(after.toMove).toBe('red')
  })

  it('takes the move back and forces the jump when called', () => {
    const called = callSalta(overlooked())
    expect(called.toMove).toBe('green')
    expect(called.position.get(square(8, 1))).toEqual(greenSun(2))
    expect(called.moveCount.green).toBe(0)
    expect(availableMoves(called)).toEqual([
      { from: square(5, 4), to: square(3, 6), over: square(4, 5) },
    ])
  })

  it('lets the overlooked jump stand when the window closes', () => {
    const waived = waiveSalta(overlooked())
    expect(waived.missedJump).toBeUndefined()
    expect(waived.position.get(square(7, 0))).toEqual(greenSun(2))
  })

  it('stays shut when the move played was the jump', () => {
    const pos = position([5, 4, greenSun(1)], [4, 5, redSun(1)])
    expect(play(stateWith(pos), square(5, 4), square(3, 6)).missedJump).toBeUndefined()
  })
})

describe('counting the moves still owed', () => {
  it('is zero for a side already home', () => {
    const home = new Map([...initialPosition()].filter(([, p]) => p.player === 'red')) as Position
    const moved = new Map<Square, Piece>()
    for (const [, piece] of home) moved.set(targetSquare(piece), piece)
    expect(movesRemaining(moved, 'red')).toBe(0)
  })

  it('counts diagonal steps, so a two-row shift straight ahead costs two', () => {
    expect(stepsBetween(square(5, 0), square(7, 0))).toBe(2)
    expect(stepsBetween(square(4, 3), square(7, 4))).toBe(3)
  })

  /**
   * The printed Schlußstellung leaves red four star pieces short of home, and
   * the caption prices that at ten moves: "dies sind in Fig. 2 zehn Züge, also
   * 10 verlorene Points für B". Transcribed from assets/photos/rules-front-flat.jpg.
   */
  it('prices the printed end position at the ten points the rules claim', () => {
    const stranded: [number, number, Piece][] = [
      [4, 3, { player: 'red', device: 'star', rank: 3 }],
      [4, 7, { player: 'red', device: 'star', rank: 2 }],
      [5, 0, { player: 'red', device: 'star', rank: 5 }],
      [5, 2, { player: 'red', device: 'star', rank: 4 }],
    ]
    const pos = new Map<Square, Piece>()
    for (const [, piece] of targetFormationOf('red')) {
      if (piece.device === 'star' && piece.rank !== 1) continue
      pos.set(targetSquare(piece), piece)
    }
    for (const [r, c, piece] of stranded) pos.set(square(r, c), piece)
    expect(pos.size).toBe(15)
    expect(movesRemaining(pos, 'red')).toBe(10)
  })
})

function targetFormationOf(player: Player) {
  return new Map([...initialPosition()].filter(([, p]) => p.player === player))
}

describe('winning', () => {
  it('ends the moment one side is fully home, and prices the loss', () => {
    const pos = new Map<Square, Piece>()
    for (const [, piece] of targetFormationOf('green')) pos.set(targetSquare(piece), piece)
    // Walk one green piece back so it needs a single move to finish.
    const last = { player: 'green', device: 'sun', rank: 1 } as const
    pos.delete(targetSquare(last))
    const start = square(1, 0)
    pos.set(start, last)
    // One stray red piece, three steps from where it belongs.
    for (const [, piece] of targetFormationOf('red')) pos.set(targetSquare(piece), piece)
    const stray = { player: 'red', device: 'star', rank: 1 } as const
    pos.delete(targetSquare(stray))
    pos.set(square(4, 5), stray)

    const finished = play(stateWith(pos), start, targetSquare(last))
    expect(finished.outcome).toEqual({
      kind: 'home',
      winner: 'green',
      points: stepsBetween(square(4, 5), targetSquare(stray)),
    })
  })
})

describe('the tournament rule', () => {
  it('is off unless asked for', () => {
    expect(newGame().tournament).toBe(false)
    expect(newGame({ tournament: true }).tournament).toBe(true)
  })

  it('scores the difference in outstanding moves when the limit runs out', () => {
    const base = newGame({ tournament: true })
    const atLimit: GameState = {
      ...base,
      moveCount: { green: TOURNAMENT_MOVE_LIMIT - 1, red: TOURNAMENT_MOVE_LIMIT },
    }
    const first = availableMoves(atLimit)[0]
    if (first === undefined) throw new Error('no move available')
    const ended = play(atLimit, first.from, first.to)
    expect(ended.outcome?.kind).toBe('limit')
  })

  it('calls an equal position a draw', () => {
    const symmetric = newGame({ tournament: true })
    expect(movesRemaining(symmetric.position, 'green')).toBe(
      movesRemaining(symmetric.position, 'red'),
    )
  })
})
