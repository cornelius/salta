import { movesRemaining } from './distance'
import { applyMove, findMove, isJump, jumpsFor, legalMoves, offerableMoves } from './rules'
import { initialPosition, type Position } from './setup'
import { type Move, opponent, PLAYERS, type Player } from './types'

/** Moves each side gets under the Turnier-Regel before the game is scored. */
export const TOURNAMENT_MOVE_LIMIT = 120

export type Outcome =
  /** One side got every piece home; the other loses its outstanding moves as points. */
  | { readonly kind: 'home'; readonly winner: Player; readonly points: number }
  /** The move limit ran out; the side closer to home wins the difference. */
  | { readonly kind: 'limit'; readonly winner: Player; readonly points: number }
  | { readonly kind: 'draw' }

/**
 * A plain move played while a jump was available. It stands unless the opponent
 * calls "Salta" before making a move of their own: "Wenn ich das Springen
 * vergessen sollte, so muß der Gegner mit 'Salta' (Springe!) zurufen."
 */
export interface MissedJump {
  readonly by: Player
  readonly move: Move
  readonly positionBefore: Position
}

export interface GameOptions {
  /** Enforce the Turnier-Regel move limit. Off by default, as in a casual game. */
  readonly tournament?: boolean
}

export interface GameState {
  readonly position: Position
  readonly toMove: Player
  readonly moveCount: Readonly<Record<Player, number>>
  /** Set while the opponent may still call Salta on the move just played. */
  readonly missedJump: MissedJump | undefined
  /** Set after a Salta call: the offender must now take a jump. */
  readonly mustJump: boolean
  readonly outcome: Outcome | undefined
  readonly tournament: boolean
}

export function newGame(options: GameOptions = {}): GameState {
  return {
    position: initialPosition(),
    toMove: 'green',
    moveCount: { green: 0, red: 0 },
    missedJump: undefined,
    mustJump: false,
    outcome: undefined,
    tournament: options.tournament ?? false,
  }
}

/**
 * The moves the player to move may pick from. Normally this includes plain moves
 * even when a jump is compulsory, so the omission rule 3 describes stays
 * reachable. After a Salta call the choice narrows to jumps.
 */
export function availableMoves(state: GameState): Move[] {
  if (state.outcome !== undefined) return []
  return state.mustJump
    ? legalMoves(state.position, state.toMove)
    : offerableMoves(state.position, state.toMove)
}

/** Whether the side to move has a jump it is obliged to take. */
export function jumpIsCompulsory(state: GameState): boolean {
  return jumpsFor(state.position, state.toMove).length > 0
}

export function canCallSalta(state: GameState): boolean {
  return state.outcome === undefined && state.missedJump !== undefined
}

export function play(state: GameState, from: number, to: number): GameState {
  if (state.outcome !== undefined) throw new Error('the game is over')
  const move = findMove(availableMoves(state), from, to)
  if (move === undefined) throw new Error(`illegal move ${from} -> ${to}`)

  const mover = state.toMove
  const missed = !isJump(move) && jumpIsCompulsory(state)
  const position = applyMove(state.position, move)
  const moveCount = { ...state.moveCount, [mover]: state.moveCount[mover] + 1 }

  const next: GameState = {
    ...state,
    position,
    toMove: opponent(mover),
    moveCount,
    missedJump: missed ? { by: mover, move, positionBefore: state.position } : undefined,
    mustJump: false,
    outcome: undefined,
  }
  return skipIfStuck({ ...next, outcome: decideOutcome(next, mover) })
}

/**
 * Hand the turn back if the side to move is walled in. The rules make this the
 * encloser's problem rather than the engine's -- "bei Einschließung muß der
 * Einschließende dem Eingeschlossenen immer noch ein Feld zum Ziehen offen
 * lassen" -- but a player who ignores that obligation must not deadlock the game.
 * With neither side able to move, there is nothing left to play for and the
 * position is scored where it stands.
 */
function skipIfStuck(state: GameState): GameState {
  if (state.outcome !== undefined || availableMoves(state).length > 0) return state
  const passed: GameState = { ...state, toMove: opponent(state.toMove), missedJump: undefined }
  if (availableMoves(passed).length > 0) return passed
  return { ...state, outcome: scoreByRemaining(state.position) }
}

/**
 * Take back the opponent's overlooked move and hand the turn back to them, with
 * the jump now compulsory.
 */
export function callSalta(state: GameState): GameState {
  const missed = state.missedJump
  if (missed === undefined) throw new Error('there is no overlooked jump to call')
  return {
    ...state,
    position: missed.positionBefore,
    toMove: missed.by,
    moveCount: { ...state.moveCount, [missed.by]: state.moveCount[missed.by] - 1 },
    missedJump: undefined,
    mustJump: true,
    outcome: undefined,
  }
}

/** Let the overlooked jump stand, closing the window without playing a move. */
export function waiveSalta(state: GameState): GameState {
  return { ...state, missedJump: undefined }
}

function decideOutcome(state: GameState, mover: Player): Outcome | undefined {
  if (movesRemaining(state.position, mover) === 0) {
    return { kind: 'home', winner: mover, points: movesRemaining(state.position, opponent(mover)) }
  }
  if (state.tournament && PLAYERS.every((p) => state.moveCount[p] >= TOURNAMENT_MOVE_LIMIT)) {
    return scoreByRemaining(state.position)
  }
  return undefined
}

/**
 * Score an unfinished position by how far each side still has to go. Under the
 * Turnier-Regel the loser concedes the difference in outstanding moves, and an
 * equal count is a draw: "Haben beide Gegner gleichviel Points am Ende
 * nachzuziehen [...] so ist die Partie unentschieden oder remis."
 */
function scoreByRemaining(position: Position): Outcome {
  const green = movesRemaining(position, 'green')
  const red = movesRemaining(position, 'red')
  if (green === red) return { kind: 'draw' }
  return {
    kind: 'limit',
    winner: green < red ? 'green' : 'red',
    points: Math.abs(green - red),
  }
}
