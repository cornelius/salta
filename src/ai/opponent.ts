import { diagonalNeighbours, row } from '../core/board'
import { movesRemaining, stepsBetween } from '../core/distance'
import type { GameState } from '../core/game'
import { applyMove, isJump, legalMoves } from '../core/rules'
import type { Position } from '../core/setup'
import { targetFormation, targetSquare } from '../core/setup'
import { type Move, opponent, type Piece, type Player, type Square } from '../core/types'

/**
 * The computer opponent. It reasons with `legalMoves` and nothing wider: it
 * never overlooks a compulsory jump, and the interface has it call "Salta" on
 * every jump the human overlooks, because both halves of rule 3 are duties
 * (ADR 006). This module imports only `src/core`.
 */

export type Level = 'easy' | 'medium' | 'hard'
export const LEVELS: readonly Level[] = ['easy', 'medium', 'hard']

/**
 * How many plies each strength looks ahead. One ply is pure greed: always the
 * move that gains the most ground, blind to what it offers the opponent, which
 * is exactly the player the rules sheet's "Springenlassen" tactics punish.
 */
const DEPTH: Record<Level, number> = { easy: 1, medium: 3, hard: 5 }

/**
 * How many of its own consecutive moves each strength plans once the race is on
 * (see `raceIsOn`). Without opponent branches in between, three own moves reach
 * as far as six plies of minimax do, which is what untangles a packed endgame.
 */
const PACK_DEPTH: Record<Level, number> = { easy: 1, medium: 4, hard: 4 }

/** Source of randomness, injectable so games are reproducible under test. */
export type Rng = () => number

/** Outranks any margin the evaluation can reach (a side owes at most ~15 * 18 steps). */
const WIN = 10_000

/** Memoised per piece: `targetSquare` rebuilds its row on every call. */
const TARGETS = new WeakMap<Piece, Square>()

function targetOf(piece: Piece): Square {
  let sq = TARGETS.get(piece)
  if (sq === undefined) {
    sq = targetSquare(piece)
    TARGETS.set(piece, sq)
  }
  return sq
}

/**
 * Extra steps charged for a path that passes over a piece already parked on its
 * own target: the parked piece has to step aside and step back, which is two
 * moves the empty-board distance does not count. This is what lets the search
 * see a wedged endgame -- `movesRemaining` reads a wrongly packed side as nearly
 * finished while no finishing move exists, so every unblocking move looked like
 * pure loss and the computer shuffled in place. Charging the detour makes a
 * parked piece in the way a cost, so backing it out pays the moment it happens,
 * and parking early on a square others still need never looks free.
 */
const PARKED_DETOUR = 2

/**
 * Shortest path from `from` to `to` where stepping onto a square in `parked`
 * costs `1 + PARKED_DETOUR` instead of 1. Dijkstra over the diagonal graph,
 * bucketed by distance, which for these weights is cheap.
 */
function detourDistance(from: Square, to: Square, parked: ReadonlySet<Square>): number {
  if (from === to) return 0
  const settled = new Map<Square, number>([[from, 0]])
  const buckets: Square[][] = [[from]]
  for (let d = 0; d < buckets.length; d++) {
    const bucket = buckets[d]
    if (bucket === undefined) continue
    for (const sq of bucket) {
      if ((settled.get(sq) ?? Infinity) < d) continue
      if (sq === to) return d
      for (const next of diagonalNeighbours(sq)) {
        const cost = d + (parked.has(next) ? 1 + PARKED_DETOUR : 1)
        if (cost < (settled.get(next) ?? Infinity)) {
          settled.set(next, cost)
          while (buckets.length <= cost) buckets.push([])
          ;(buckets[cost] as Square[]).push(next)
        }
      }
    }
  }
  return stepsBetween(from, to)
}

/** Which piece each target square is reserved for, per side. The targets never move. */
const TARGET_OWNER: Record<Player, ReadonlyMap<Square, Piece>> = {
  green: targetFormation('green'),
  red: targetFormation('red'),
}

/** A side's burden, carried with the parked set it was measured around. */
interface Pack {
  readonly total: number
  readonly parked: ReadonlySet<Square>
}

/**
 * Measured ways home, per parked set. The set object is shared down every
 * subtree until a piece parks or unparks, so most measurements are repeats
 * of one another and the cache answers them.
 */
const WAYS = new WeakMap<ReadonlySet<Square>, Map<number, number>>()

/**
 * One set object per parked arrangement, so that `WAYS` also answers across
 * positions that merely rebuilt the same arrangement -- which is every leaf of
 * a minimax search through a half-parked endgame. Cleared when it grows past
 * what a game plausibly visits.
 */
const PARKED_SETS = new Map<string, ReadonlySet<Square>>()

function canonical(parked: ReadonlySet<Square>): ReadonlySet<Square> {
  if (parked.size === 0) return parked
  const signature = [...parked].sort((a, b) => a - b).join(',')
  const known = PARKED_SETS.get(signature)
  if (known !== undefined) return known
  if (PARKED_SETS.size > 512) PARKED_SETS.clear()
  PARKED_SETS.set(signature, parked)
  return parked
}

/** The shortest way home, walked around the parked pieces. */
function wayHome(from: Square, target: Square, parked: ReadonlySet<Square>): number {
  if (parked.size === 0) return stepsBetween(from, target)
  let known = WAYS.get(parked)
  if (known === undefined) {
    known = new Map()
    WAYS.set(parked, known)
  }
  const key = from * 100 + target
  let way = known.get(key)
  if (way === undefined) {
    way = detourDistance(from, target, parked)
    known.set(key, way)
  }
  return way
}

/**
 * What a side still owes: the moves the game itself scores, walked around the
 * side's own parked pieces, plus the same detour for a target square a sibling
 * is squatting on -- the squatter has to be evicted before the owner can park,
 * and it is not in `parked` because it is not home itself. With nothing parked
 * and nothing squatted this is exactly `movesRemaining`.
 */
function packOf(position: Position, player: Player): Pack {
  const gathered = new Set<Square>()
  const out: [Square, Square][] = []
  for (const [sq, piece] of position) {
    if (piece.player !== player) continue
    const target = targetOf(piece)
    if (sq === target) gathered.add(sq)
    else out.push([sq, target])
  }
  const parked = canonical(gathered)
  let total = 0
  for (const [sq, target] of out) {
    total += wayHome(sq, target, parked)
    if (position.get(target)?.player === player) total += PARKED_DETOUR
  }
  return { total, parked }
}

function burden(position: Position, player: Player): number {
  return packOf(position, player).total
}

/**
 * `packOf` after one of the player's own moves, without remeasuring the whole
 * side: only the moved piece's way home changes, along with the squatter charge
 * on any sibling whose reserved square the piece left or entered. The exception
 * is a move onto or off the mover's own target, which changes the parked set
 * every other distance was measured around, so those remeasure in full. `next`
 * is the position with the move already made; `piece` is the mover.
 */
function packAfter(next: Position, player: Player, pack: Pack, move: Move, piece: Piece): Pack {
  const target = targetOf(piece)
  if (move.to === target || pack.parked.has(move.from)) return packOf(next, player)
  let total =
    pack.total - wayHome(move.from, target, pack.parked) + wayHome(move.to, target, pack.parked)
  const owners = TARGET_OWNER[player]
  if (owners.has(move.from)) total -= PARKED_DETOUR
  if (owners.has(move.to)) total += PARKED_DETOUR
  return { total, parked: pack.parked }
}

/**
 * The margin the game itself scores: how many moves the opponent still owes
 * beyond one's own. This is the quantity a finished game and the tournament
 * limit both count in points, so the evaluation stays the printed stakes,
 * measured around the blockages they cannot see (ADR 006).
 */
function evaluate(position: Position, player: Player): number {
  return burden(position, opponent(player)) - burden(position, player)
}

/**
 * Whether the two sides are done with each other: every green piece past every
 * red one, each side facing only its own packing. From here the game is two
 * independent races, so planning opponent replies wastes the search's depth --
 * the moves that matter are one's own. Backing out during the pack can re-close
 * the gap at the boundary; the test is re-run on every move, and the search
 * falls back to minimax when it does.
 */
function raceIsOn(position: Position): boolean {
  let maxGreen = -1
  let minRed = 10
  for (const [sq, piece] of position) {
    if (piece.player === 'green') maxGreen = Math.max(maxGreen, row(sq))
    else minRed = Math.min(minRed, row(sq))
  }
  return maxGreen < minRed
}

/** A move can shed at most this much burden: a jump's two steps, plus a cleared detour. */
const MAX_SHED = 4

/**
 * How far above its starting burden a pack line may wander. Opening a wedge
 * costs a step or two before it pays; anything climbing higher is not packing,
 * and cutting it is what keeps the search's flat positions -- where nothing
 * improves and branch and bound has no bound to work with -- from exploding.
 */
const CORRIDOR = 2

/**
 * The moves worth planning in the race: every move of a piece still travelling,
 * and of a parked piece standing within two steps of a target a sibling still
 * has to reach -- the ones whose stepping aside can open a lane. The remaining
 * parked pieces' shuffles only widen the tree. Jumps pass unfiltered: they are
 * compulsory, and the filter must not hide one.
 */
function packMoves(position: Position, player: Player): Move[] {
  const moves = legalMoves(position, player)
  const first = moves[0]
  if (first === undefined || isJump(first)) return moves
  const parked = new Set<Square>()
  const wanted: Square[] = []
  for (const [sq, piece] of position) {
    if (piece.player !== player) continue
    const target = targetOf(piece)
    if (sq === target) parked.add(sq)
    else wanted.push(target)
  }
  const filtered = moves.filter(
    (m) => !parked.has(m.from) || wanted.some((t) => stepsBetween(m.from, t) <= 2),
  )
  return filtered.length > 0 ? filtered : moves
}

/**
 * The least burden reachable in `depth` of the player's own moves, the race
 * counterpart of `search`. Branch and bound inside the corridor: a line that
 * cannot shed enough to beat the best already found is cut, and so is one that
 * has climbed above `ceiling`.
 */
/**
 * How many children a pack node follows. The children are ordered by their
 * measured pack, which prices an unblocking move by everything it frees, so
 * the cut falls on the moves that neither advance nor open anything.
 */
const PACK_WIDTH = 12

function packSearch(
  position: Map<Square, Piece>,
  player: Player,
  pack: Pack,
  depth: number,
  ceiling: number,
  bound: number,
): number {
  const here = pack.total
  if (depth === 0 || here === 0 || here > ceiling) return here
  if (here - depth * MAX_SHED >= bound) return here
  // Make, measure, unmake: cheaper than copying the position at every node,
  // and nothing below keeps a reference to it.
  const children: { move: Move; piece: Piece; pack: Pack }[] = []
  for (const move of packMoves(position, player)) {
    const piece = position.get(move.from)
    if (piece === undefined) continue
    position.delete(move.from)
    position.set(move.to, piece)
    children.push({ move, piece, pack: packAfter(position, player, pack, move, piece) })
    position.delete(move.to)
    position.set(move.from, piece)
  }
  children.sort((a, b) => a.pack.total - b.pack.total)
  let best = bound
  for (const child of children.slice(0, PACK_WIDTH)) {
    position.delete(child.move.from)
    position.set(child.move.to, child.piece)
    const reached = packSearch(position, player, child.pack, depth - 1, ceiling, best)
    position.delete(child.move.to)
    position.set(child.move.from, child.piece)
    if (reached < best) best = reached
  }
  return Math.min(here, best)
}

/** How much nearer its target the moved piece ends up. Orders the search best-first. */
function progress(position: Position, move: Move): number {
  const piece = position.get(move.from)
  if (piece === undefined) return 0
  const target = targetOf(piece)
  return stepsBetween(move.from, target) - stepsBetween(move.to, target)
}

/**
 * Plain alpha-beta minimax over `legalMoves`, scored for `player`. Both sides
 * are assumed to jump when they must; the omission the interface allows a human
 * is not in the computer's tree.
 */
function search(
  position: Position,
  toMove: Player,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  if (depth === 0) return evaluate(position, player)
  const moves = legalMoves(position, toMove)
  if (moves.length === 0) {
    // Walled in. The game hands the turn back (skipIfStuck); passing costs no ply.
    if (legalMoves(position, opponent(toMove)).length === 0) return evaluate(position, player)
    return search(position, opponent(toMove), player, depth, alpha, beta)
  }
  moves.sort((a, b) => progress(position, b) - progress(position, a))
  const maximizing = toMove === player
  let best = maximizing ? -Infinity : Infinity
  for (const move of moves) {
    const next = applyMove(position, move)
    const score =
      movesRemaining(next, toMove) === 0
        ? toMove === player
          ? WIN + depth
          : -(WIN + depth)
        : search(next, opponent(toMove), player, depth - 1, alpha, beta)
    if (maximizing) {
      if (score > best) best = score
      if (best > alpha) alpha = best
    } else {
      if (score < best) best = score
      if (best < beta) beta = best
    }
    if (beta <= alpha) break
  }
  return best
}

function shuffled(moves: readonly Move[], rng: Rng): Move[] {
  const out = [...moves]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i] as Move
    out[i] = out[j] as Move
    out[j] = swap
  }
  return out
}

/** A position as a string, for counting how often the game has stood here. */
export function positionKey(position: Position): string {
  return (
    [...position]
      // Two letters of the device, because sun and star share their first.
      .map(([sq, p]) => `${sq}:${p.player[0]}${p.device.slice(0, 2)}${p.rank}`)
      .sort()
      .join(',')
  )
}

/**
 * What one recurrence costs, escalating each time the game stands in the same
 * position again. The evaluation has no memory, so on ground it scores as flat
 * the search will happily circle -- which in a wedged endgame it did, revisiting
 * one position twenty-six times. Charging recurrences drains the plateau: every
 * lap prices the trodden ground further down until the way out, at worst a
 * point or two below the circle, is the best move left.
 */
const RECURRENCE = 2

/** The race move: the deepest pack line reachable from each candidate, compared. */
function choosePackMove(
  position: Position,
  player: Player,
  moves: readonly Move[],
  level: Level,
  seen: ReadonlyMap<string, number> | undefined,
): Move {
  const pack = packOf(position, player)
  const ceiling = pack.total + CORRIDOR
  let best = moves[0] as Move
  let bestScore = -Infinity
  for (const move of moves) {
    const next = applyMove(position, move)
    if (movesRemaining(next, player) === 0) return move
    const recurred = seen?.get(positionKey(next)) ?? 0
    // A candidate only matters if its score can top bestScore, which bounds
    // the burden worth searching below exactly.
    const reached = packSearch(
      new Map(next),
      player,
      packAfter(next, player, pack, move, position.get(move.from) as Piece),
      PACK_DEPTH[level] - 1,
      ceiling,
      -bestScore - recurred * RECURRENCE,
    )
    const score = -reached - recurred * RECURRENCE
    if (score > bestScore) {
      bestScore = score
      best = move
    }
  }
  return best
}

/**
 * The move the computer plays. Equal-best moves are decided by the shuffle
 * underneath the stable sort, so two games at the same strength do not replay
 * each other move for move. `seen` counts the positions the game has already
 * stood in, keyed by {@link positionKey}; recreating one is charged at the root.
 */
export function chooseMove(
  state: GameState,
  level: Level,
  rng: Rng = Math.random,
  seen?: ReadonlyMap<string, number>,
): Move {
  const player = state.toMove
  const moves = shuffled(legalMoves(state.position, player), rng)
  moves.sort((a, b) => progress(state.position, b) - progress(state.position, a))
  let best = moves[0]
  if (best === undefined) throw new Error(`no legal move for ${player}`)
  if (raceIsOn(state.position)) return choosePackMove(state.position, player, moves, level, seen)
  let bestScore = -Infinity
  for (const move of moves) {
    const next = applyMove(state.position, move)
    const recurred = seen?.get(positionKey(next)) ?? 0
    // A candidate only matters if its score can top bestScore, which bounds
    // what the search has to resolve below exactly.
    const outlook =
      movesRemaining(next, player) === 0
        ? WIN + DEPTH[level]
        : search(next, opponent(player), player, DEPTH[level] - 1, bestScore - 1, Infinity)
    const score = outlook - recurred * RECURRENCE
    if (score > bestScore) {
      bestScore = score
      best = move
    }
  }
  return best
}
