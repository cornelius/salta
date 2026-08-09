/**
 * The game as it stands, written to the browser's store after every turn and
 * read back when the page opens. A game is a thing standing on a table: leaving
 * the page to look up a rule, reloading, or closing the tab must not sweep the
 * pieces off it.
 *
 * Stored data outlives the code that wrote it, so nothing here trusts what it
 * reads. A game that fails any check is dropped rather than repaired -- the cost
 * is one game, and the alternative is a position the board cannot draw.
 */
import { SQUARES } from '../core/board'
import type { GameState, MissedJump, Outcome } from '../core/game'
import type { Position } from '../core/setup'
import {
  DEVICES,
  type Move,
  type Piece,
  PLAYERS,
  type Player,
  RANKS,
  type Square,
} from '../core/types'

const STORAGE_KEY = 'salta.game'

/** Bumped when the stored shape changes. An older game is dropped, not migrated. */
const VERSION = 1

export function saveGame(state: GameState): void {
  const stored = {
    version: VERSION,
    position: [...state.position],
    toMove: state.toMove,
    moveCount: state.moveCount,
    mustJump: state.mustJump,
    missedJump:
      state.missedJump === undefined
        ? null
        : { ...state.missedJump, positionBefore: [...state.missedJump.positionBefore] },
    outcome: state.outcome ?? null,
    tournament: state.tournament,
  }
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // A store that is full, or refused outright as it is in a private window, is
    // no reason to stop the game. It only means this one ends with the page.
  }
}

export function loadGame(): GameState | undefined {
  const text = globalThis.localStorage?.getItem(STORAGE_KEY)
  if (text === null || text === undefined) return undefined
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!isObject(raw) || raw.version !== VERSION) return undefined

  const position = readPosition(raw.position)
  const toMove = readPlayer(raw.toMove)
  const moveCount = readMoveCount(raw.moveCount)
  if (position === undefined || toMove === undefined || moveCount === undefined) return undefined
  if (typeof raw.mustJump !== 'boolean' || typeof raw.tournament !== 'boolean') return undefined

  // Both of these stand for something that is usually not there, so absence is
  // spelled `null` and tells nothing apart from rubbish that failed to read.
  const missedJump = raw.missedJump === null ? undefined : readMissedJump(raw.missedJump)
  if (raw.missedJump !== null && missedJump === undefined) return undefined
  const outcome = raw.outcome === null ? undefined : readOutcome(raw.outcome)
  if (raw.outcome !== null && outcome === undefined) return undefined

  return {
    position,
    toMove,
    moveCount,
    missedJump,
    mustJump: raw.mustJump,
    outcome,
    tournament: raw.tournament,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readPlayer(value: unknown): Player | undefined {
  return PLAYERS.find((player) => player === value)
}

function readSquare(value: unknown): Square | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < SQUARES
    ? value
    : undefined
}

function readPiece(value: unknown): Piece | undefined {
  if (!isObject(value)) return undefined
  const player = readPlayer(value.player)
  const device = DEVICES.find((name) => name === value.device)
  const rank = RANKS.find((number) => number === value.rank)
  if (player === undefined || device === undefined || rank === undefined) return undefined
  return { player, device, rank }
}

function readPosition(value: unknown): Position | undefined {
  if (!Array.isArray(value)) return undefined
  const position = new Map<Square, Piece>()
  for (const entry of value) {
    if (!Array.isArray(entry)) return undefined
    const square = readSquare(entry[0])
    const piece = readPiece(entry[1])
    if (square === undefined || piece === undefined) return undefined
    position.set(square, piece)
  }
  return position
}

/** Counts and points are whole and never negative; anything else failed to read. */
function readCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

function readMoveCount(value: unknown): Record<Player, number> | undefined {
  if (!isObject(value)) return undefined
  const green = readCount(value.green)
  const red = readCount(value.red)
  if (green === undefined || red === undefined) return undefined
  return { green, red }
}

function readMove(value: unknown): Move | undefined {
  if (!isObject(value)) return undefined
  const from = readSquare(value.from)
  const to = readSquare(value.to)
  if (from === undefined || to === undefined) return undefined
  if (value.over === undefined || value.over === null) return { from, to }
  const over = readSquare(value.over)
  return over === undefined ? undefined : { from, to, over }
}

function readMissedJump(value: unknown): MissedJump | undefined {
  if (!isObject(value)) return undefined
  const by = readPlayer(value.by)
  const move = readMove(value.move)
  const positionBefore = readPosition(value.positionBefore)
  if (by === undefined || move === undefined || positionBefore === undefined) return undefined
  return { by, move, positionBefore }
}

function readOutcome(value: unknown): Outcome | undefined {
  if (!isObject(value)) return undefined
  if (value.kind === 'draw') return { kind: 'draw' }
  if (value.kind !== 'home' && value.kind !== 'limit') return undefined
  const winner = readPlayer(value.winner)
  const points = readCount(value.points)
  if (winner === undefined || points === undefined) return undefined
  return { kind: value.kind, winner, points }
}
