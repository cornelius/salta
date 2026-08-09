import { chooseMove, type Level, positionKey, type Rng } from '../ai/opponent'
import { SQUARES, squareName } from '../core/board'
import { movesRemaining } from '../core/distance'
import {
  availableMoves,
  callSalta,
  canCallSalta,
  type GameState,
  jumpIsCompulsory,
  newGame,
  play,
  TOURNAMENT_MOVE_LIMIT,
  waiveSalta,
} from '../core/game'
import { isJump } from '../core/rules'
import { type Position, targetPosition } from '../core/setup'
import { type Move, type Piece, type Player, pieceId, type Square } from '../core/types'
import {
  LOCALE_NAMES,
  LOCALES,
  type Locale,
  preferredLocale,
  rememberLocale,
  type Translate,
  translator,
} from '../i18n'
import { BOARD_SIZE, boardMarkup, CELL, diagramMarkup, squareOrigin } from '../render/board'
import { isReplacement, pieceMarkup, replacementMarkup } from '../render/piece'
import { OWNER_MARKS } from '../render/theme'

const SVG_NS = 'http://www.w3.org/2000/svg'
const COPY_STORAGE_KEY = 'salta.copy'
const OPPONENT_STORAGE_KEY = 'salta.opponent'
const SIDE_STORAGE_KEY = 'salta.side'

/** Who sits across the board: another person at the same screen, or the computer. */
type Opponent = 'human' | Level

/**
 * A beat between the board settling and the computer acting, so its move reads
 * as a turn taken rather than a flicker of the position.
 */
const COMPUTER_DELAY = 600

/**
 * Whoever the human plays, they play up the board. Green already does; a human
 * on red sees the board turned half around, which for the printing changes
 * nothing -- squares, frame, and the twice-printed maker's mark are all
 * symmetric under the turn -- so only the pieces need their squares remapped.
 */
function viewSquare(sq: Square, flip: boolean): Square {
  return flip ? SQUARES - 1 - sq : sq
}

function flippedPosition(position: Position): Position {
  return new Map([...position].map(([sq, piece]) => [viewSquare(sq, true), piece]))
}

/**
 * Whether to draw the set as the copy it was reconstructed from now is, marks,
 * replacements and all. Remembered, like the language, because it is a standing
 * preference rather than something to set again every visit.
 */
function preferredCopy(): boolean {
  return globalThis.localStorage?.getItem(COPY_STORAGE_KEY) === 'yes'
}

function rememberCopy(showCopy: boolean): void {
  globalThis.localStorage?.setItem(COPY_STORAGE_KEY, showCopy ? 'yes' : 'no')
}

/** Opponent and colour are standing preferences, remembered like the language. */
function preferredOpponent(): Opponent {
  const stored = globalThis.localStorage?.getItem(OPPONENT_STORAGE_KEY)
  return stored === 'easy' || stored === 'medium' || stored === 'hard' ? stored : 'human'
}

function rememberOpponent(rival: Opponent): void {
  globalThis.localStorage?.setItem(OPPONENT_STORAGE_KEY, rival)
}

function preferredSide(): Player {
  return globalThis.localStorage?.getItem(SIDE_STORAGE_KEY) === 'red' ? 'red' : 'green'
}

function rememberSide(side: Player): void {
  globalThis.localStorage?.setItem(SIDE_STORAGE_KEY, side)
}

interface View {
  readonly board: SVGSVGElement
  readonly printing: SVGGElement
  readonly pieces: Map<string, SVGGElement>
  readonly hints: SVGGElement
  readonly target: HTMLElement
  readonly turn: HTMLElement
  readonly notice: HTMLElement
  readonly noticeText: HTMLElement
  readonly saltaCall: HTMLButtonElement
  readonly saltaWaive: HTMLButtonElement
  readonly restartStart: HTMLButtonElement
  readonly restartKeep: HTMLButtonElement
  readonly status: HTMLElement
  readonly tournament: HTMLInputElement
  readonly copy: HTMLInputElement
  readonly opponent: HTMLSelectElement
  readonly side: HTMLSelectElement
  readonly sideField: HTMLElement
}

export interface MountOptions {
  /** Randomness for the computer's tie-breaking; injectable so tests replay. */
  readonly rng?: Rng
}

export function mount(root: HTMLElement, options: MountOptions = {}): void {
  const rng = options.rng ?? Math.random
  let locale = preferredLocale()
  let t = translator(locale)
  let state = newGame()
  let selected: Square | undefined
  let showCopy = preferredCopy()
  let rival = preferredOpponent()
  let side = preferredSide()
  let thinking: ReturnType<typeof setTimeout> | undefined
  /** Whether the player has been asked to give up the game under way. */
  let confirming = false
  /** Every position this game has stood in: the computer's memory against circling. */
  let seen = new Map<string, number>()

  const record = (): void => {
    const key = positionKey(state.position)
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }

  const solo = () => rival !== 'human'
  const flip = () => solo() && side === 'red'

  const chrome = () => ({ tournament: state.tournament, copy: showCopy, rival, side, flip: flip() })

  root.innerHTML = shell(t, locale, chrome())
  const view = collect(root)

  const setLocale = (next: Locale): void => {
    locale = next
    t = translator(locale)
    rememberLocale(next)
    document.documentElement.lang = next
    root.innerHTML = shell(t, locale, chrome())
    Object.assign(view, collect(root))
    wire()
    render()
  }

  /** Both the board and two of the pieces are drawn differently, so both go. */
  const setCopy = (next: boolean): void => {
    showCopy = next
    rememberCopy(next)
    view.printing.innerHTML = printingMarkup(showCopy, flip())
    view.target.innerHTML = targetMarkup(t, showCopy, flip())
    for (const piece of view.pieces.values()) piece.remove()
    view.pieces.clear()
    render()
  }

  /**
   * The settings as the controls now stand. A setting is only taken up here, so
   * a change the player thinks better of never reaches the game or the store,
   * and several made while the question is open are taken up together.
   */
  const adopt = (): void => {
    const level = view.opponent.value
    rival = level === 'easy' || level === 'medium' || level === 'hard' ? level : 'human'
    rememberOpponent(rival)
    side = view.side.value === 'red' ? 'red' : 'green'
    rememberSide(side)
    view.sideField.hidden = !solo()
    start()
  }

  /** The controls as the settings now stand: what a declined question puts back. */
  const revert = (): void => {
    view.tournament.checked = state.tournament
    view.opponent.value = rival
    view.side.value = side
    view.sideField.hidden = !solo()
  }

  /**
   * Every way of starting a game throws away the one under way, so each asks
   * first -- unless there is nothing to throw away: an untouched board or a game
   * already decided restarts without a word, or the question becomes something
   * the player learns to click through.
   */
  const askRestart = (): void => {
    const played = state.moveCount.green + state.moveCount.red
    if (state.outcome !== undefined || played === 0) {
      adopt()
      return
    }
    confirming = true
    render()
  }

  const start = (): void => {
    confirming = false
    state = newGame({ tournament: view.tournament.checked })
    selected = undefined
    seen = new Map()
    record()
    // Changing seats gets here, and the squares of the board are named from the
    // seat, so the printing is laid again along with the figure in the panel.
    view.printing.innerHTML = printingMarkup(showCopy, flip())
    view.target.innerHTML = targetMarkup(t, showCopy, flip())
    render()
    scheduleComputer()
  }

  function onSquare(sq: Square): void {
    if (state.outcome !== undefined) return
    // While it is the computer's turn -- to move, or to call Salta -- the board
    // is the computer's, and clicks on it pick nothing up.
    if (solo() && state.toMove !== side) return
    const moves = availableMoves(state)
    if (selected !== undefined) {
      const move = moves.find((m) => m.from === selected && m.to === sq)
      if (move !== undefined) {
        state = play(state, move.from, move.to)
        record()
        selected = undefined
        render()
        scheduleComputer()
        return
      }
    }
    selected = moves.some((m) => m.from === sq) ? sq : undefined
    render()
  }

  function scheduleComputer(): void {
    if (thinking !== undefined) {
      clearTimeout(thinking)
      thinking = undefined
    }
    if (!solo() || state.outcome !== undefined || state.toMove === side) return
    thinking = setTimeout(computerActs, COMPUTER_DELAY)
  }

  function computerActs(): void {
    thinking = undefined
    if (rival === 'human' || state.outcome !== undefined || state.toMove === side) return
    if (canCallSalta(state)) {
      // Both halves of rule 3 are duties: the computer neither overlooks a jump
      // nor lets the human's overlooked jump pass. It always calls (ADR 006).
      state = callSalta(state)
    } else {
      const move = chooseMove(state, rival, rng, seen)
      state = play(state, move.from, move.to)
    }
    record()
    render()
    scheduleComputer()
  }

  function wire(): void {
    view.board.addEventListener('click', (event) => {
      const target = (event.target as Element).closest('[data-square]')
      const value = target?.getAttribute('data-square')
      if (value !== null && value !== undefined) onSquare(Number(value))
    })
    view.saltaCall.addEventListener('click', () => {
      state = callSalta(state)
      record()
      selected = undefined
      render()
    })
    view.saltaWaive.addEventListener('click', () => {
      state = waiveSalta(state)
      render()
    })
    // Each of these ends the game and begins another, so each goes through the
    // question. Language and the copy in hand do not: they redraw the board the
    // game is standing on, and leave the game standing.
    view.tournament.addEventListener('change', askRestart)
    view.opponent.addEventListener('change', askRestart)
    view.side.addEventListener('change', askRestart)
    root.querySelector('#new-game')?.addEventListener('click', askRestart)
    view.restartStart.addEventListener('click', adopt)
    view.restartKeep.addEventListener('click', () => {
      confirming = false
      revert()
      render()
    })
    view.copy.addEventListener('change', (event) => {
      setCopy((event.target as HTMLInputElement).checked)
    })
    root.querySelector('#locale')?.addEventListener('change', (event) => {
      setLocale((event.target as HTMLSelectElement).value as Locale)
    })
  }

  function render(): void {
    drawPieces(view, state, t, showCopy, flip())
    drawHints(view, state, selected, flip())
    drawStatus(view, state, t, solo(), confirming)
  }

  record()
  wire()
  render()
  scheduleComputer()
}

interface Chrome {
  readonly tournament: boolean
  readonly copy: boolean
  readonly rival: Opponent
  readonly side: Player
  readonly flip: boolean
}

function shell(t: Translate, locale: Locale, chrome: Chrome): string {
  const options = LOCALES.map(
    (l) => `<option value="${l}"${l === locale ? ' selected' : ''}>${LOCALE_NAMES[l]}</option>`,
  ).join('')
  const checked = (on: boolean) => (on ? ' checked' : '')
  return `
    <header class="masthead">
      <div class="masthead-titles">
        <h1>${t('app.title')}</h1>
        <p class="subtitle">${t('app.subtitle')}</p>
      </div>
      <nav class="masthead-controls">
        <a class="link" href="./rules/">${t('control.rules')}</a>
        <label class="field">
          <span class="field-label">${t('control.language')}</span>
          <select id="locale">${options}</select>
        </label>
      </nav>
    </header>

    <main class="table">
      <svg class="board" id="board" viewBox="0 0 ${BOARD_SIZE} ${BOARD_SIZE}"
           role="img" aria-label="${t('a11y.board')}">
        <g id="printing">${printingMarkup(chrome.copy, chrome.flip)}</g>
        <g id="hints"></g>
        <g id="pieces"></g>
      </svg>

      <aside class="panel">
        <p class="turn" id="turn"></p>

        <div class="notice" id="notice">
          <p class="notice-text" id="notice-text"></p>
          <div class="notice-actions">
            <button type="button" class="button primary" id="salta-call">${t('salta.call')}</button>
            <button type="button" class="button" id="salta-waive">${t('salta.letStand')}</button>
            <button type="button" class="button primary"
                    id="restart-start">${t('restart.start')}</button>
            <button type="button" class="button" id="restart-keep">${t('restart.keep')}</button>
          </div>
        </div>

        <dl class="status" id="status"></dl>

        <figure class="target" id="target">${targetMarkup(t, chrome.copy, chrome.flip)}</figure>

        <div class="controls">
          <div class="field-row">
            <label class="field">
              <span class="field-label">${t('control.opponent')}</span>
              <select id="opponent">${opponentOptions(t, chrome.rival)}</select>
            </label>
            <label class="field" id="side-field"${chrome.rival === 'human' ? ' hidden' : ''}>
              <span class="field-label">${t('control.youPlay')}</span>
              <select id="side">${sideOptions(t, chrome.side)}</select>
            </label>
          </div>
          <label class="field checkbox"
                 title="${t('control.tournamentHint', { limit: TOURNAMENT_MOVE_LIMIT })}">
            <input type="checkbox" id="tournament"${checked(chrome.tournament)} />
            <span>${t('control.tournament')}</span>
          </label>
          <label class="field checkbox" title="${t('control.copyHint')}">
            <input type="checkbox" id="copy"${checked(chrome.copy)} />
            <span>${t('control.copy')}</span>
          </label>
          <button type="button" class="button" id="new-game">${t('control.newGame')}</button>
        </div>
      </aside>
    </main>`
}

/**
 * The board under the pieces. Its squares carry the names the clicks are read
 * by, so it is drawn from the same seat as everything laid on top of it.
 */
function printingMarkup(showCopy: boolean, flip: boolean): string {
  return boardMarkup({ flip, ...(showCopy ? { marks: OWNER_MARKS } : {}) })
}

function opponentOptions(t: Translate, rival: Opponent): string {
  const rivals: readonly Opponent[] = ['human', 'easy', 'medium', 'hard']
  return rivals
    .map(
      (value) =>
        `<option value="${value}"${value === rival ? ' selected' : ''}>` +
        `${t(`opponent.${value}`)}</option>`,
    )
    .join('')
}

function sideOptions(t: Translate, side: Player): string {
  const sides: readonly Player[] = ['green', 'red']
  return sides
    .map(
      (value) =>
        `<option value="${value}"${value === side ? ' selected' : ''}>` +
        `${t(`player.${value}`)}</option>`,
    )
    .join('')
}

/**
 * The board as it looks when both sides are home, small, in the panel. Which
 * device stands in which row, in what order, and which way a side is going are
 * all things a player has to hold in their head otherwise, and the sheet answers
 * them with a figure rather than with a sentence. It shows the board the way the
 * player sees it, so it flips with the view.
 */
function targetMarkup(t: Translate, showCopy: boolean, flip: boolean): string {
  const position = flip ? flippedPosition(targetPosition()) : targetPosition()
  return (
    `<figcaption>${t('status.target')}</figcaption>` +
    `<svg class="target-board" viewBox="0 0 ${BOARD_SIZE} ${BOARD_SIZE}" role="img" ` +
    `aria-label="${t('a11y.target')}">` +
    // No maker's mark: at this size it is a smudge in the margin.
    `${diagramMarkup(position, {
      showMakerMark: false,
      ...(showCopy ? { marks: OWNER_MARKS } : {}),
    })}</svg>`
  )
}

function collect(root: HTMLElement): View {
  const need = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector)
    if (element === null) throw new Error(`missing element ${selector}`)
    return element
  }
  return {
    board: need<SVGSVGElement>('#board'),
    printing: need<SVGGElement>('#printing'),
    pieces: new Map(),
    hints: need<SVGGElement>('#hints'),
    target: need('#target'),
    turn: need('#turn'),
    notice: need('#notice'),
    noticeText: need('#notice-text'),
    saltaCall: need<HTMLButtonElement>('#salta-call'),
    saltaWaive: need<HTMLButtonElement>('#salta-waive'),
    restartStart: need<HTMLButtonElement>('#restart-start'),
    restartKeep: need<HTMLButtonElement>('#restart-keep'),
    status: need('#status'),
    tournament: need<HTMLInputElement>('#tournament'),
    copy: need<HTMLInputElement>('#copy'),
    opponent: need<HTMLSelectElement>('#opponent'),
    side: need<HTMLSelectElement>('#side'),
    sideField: need('#side-field'),
  }
}

function drawPieces(
  view: View,
  state: GameState,
  t: Translate,
  showCopy: boolean,
  flip: boolean,
): void {
  const layer = view.board.querySelector('#pieces')
  if (layer === null) return
  const live = new Set<string>()

  for (const [sq, piece] of state.position) {
    const id = pieceId(piece)
    live.add(id)
    let element = view.pieces.get(id)
    if (element === undefined) {
      element = document.createElementNS(SVG_NS, 'g')
      element.setAttribute('class', 'piece')
      element.innerHTML =
        showCopy && isReplacement(piece)
          ? replacementMarkup(piece, OWNER_MARKS)
          : pieceMarkup(piece)
      // A transparent square over the piece keeps the click target the whole cell.
      const hit = document.createElementNS(SVG_NS, 'rect')
      hit.setAttribute('width', String(CELL))
      hit.setAttribute('height', String(CELL))
      hit.setAttribute('fill', 'transparent')
      element.append(hit)
      layer.append(element)
      view.pieces.set(id, element)
    }
    const { x, y } = squareOrigin(viewSquare(sq, flip))
    element.setAttribute('transform', `translate(${x} ${y})`)
    element.setAttribute('data-square', String(sq))
    element.setAttribute('data-piece', id)
    element.setAttribute('aria-label', describe(piece, sq, t))
  }

  for (const [id, element] of view.pieces) {
    if (!live.has(id)) {
      element.remove()
      view.pieces.delete(id)
    }
  }
}

function describe(piece: Piece, sq: Square, t: Translate): string {
  return t('a11y.piece', {
    player: t(`player.${piece.player}`),
    device: t(`device.${piece.device}`),
    rank: piece.rank,
    square: squareName(sq),
  })
}

function drawHints(
  view: View,
  state: GameState,
  selected: Square | undefined,
  flip: boolean,
): void {
  const shapes: string[] = []
  const moves = availableMoves(state)
  const origin = (sq: Square) => squareOrigin(viewSquare(sq, flip))

  // Every mark lies over a square and takes the clicks meant for it, so each one
  // names the square it covers: a dot marking a destination has to be a way of
  // reaching it, not a hole in the board.
  if (selected !== undefined) {
    const { x, y } = origin(selected)
    shapes.push(
      `<rect class="hint-selected" data-square="${selected}" ` +
        `x="${x}" y="${y}" width="${CELL}" height="${CELL}"/>`,
    )
    for (const move of moves.filter((m: Move) => m.from === selected)) {
      const to = origin(move.to)
      shapes.push(
        `<circle class="hint-move${isJump(move) ? ' hint-jump' : ''}" data-square="${move.to}" ` +
          `cx="${to.x + CELL / 2}" cy="${to.y + CELL / 2}" r="16"/>`,
      )
      // Mark the piece being jumped, so the reason for the long move is visible.
      if (move.over !== undefined) {
        const over = origin(move.over)
        shapes.push(
          `<rect class="hint-over" data-square="${move.over}" ` +
            `x="${over.x}" y="${over.y}" width="${CELL}" height="${CELL}"/>`,
        )
      }
    }
  }
  view.hints.innerHTML = shapes.join('')
}

function drawStatus(
  view: View,
  state: GameState,
  t: Translate,
  solo: boolean,
  confirming: boolean,
): void {
  const name = (player: 'green' | 'red') => t(`player.${player}`)

  if (state.outcome !== undefined) {
    const outcome = state.outcome
    view.turn.textContent =
      outcome.kind === 'draw'
        ? t('outcome.draw')
        : outcome.kind === 'home'
          ? t('outcome.home', {
              winner: name(outcome.winner),
              loser: name(outcome.winner === 'green' ? 'red' : 'green'),
              points: outcome.points,
            })
          : t('outcome.limit', { winner: name(outcome.winner), points: outcome.points })
    view.turn.dataset.player = ''
  } else {
    const key = state.mustJump
      ? 'turn.mustJump'
      : jumpIsCompulsory(state)
        ? 'turn.jumpAvailable'
        : 'turn.toMove'
    view.turn.textContent = t(key, { player: name(state.toMove) })
    view.turn.dataset.player = state.toMove
  }

  // In a solo game the window belongs to the computer, which always calls, so
  // the buttons never show; the notice instead voices the call once it is made.
  const pending = state.missedJump
  const called = solo && state.outcome === undefined && state.mustJump
  const salta = solo ? called : pending !== undefined
  // Asked whether to give the game up, the notice carries the question instead.
  // Nothing is lost by that: what Salta had to say is still true underneath, and
  // says itself again the moment the game goes on.
  view.notice.dataset.open = confirming || salta ? 'yes' : 'no'
  view.noticeText.textContent = confirming
    ? t('restart.prompt')
    : called
      ? t('salta.called', { player: name(state.toMove) })
      : !solo && pending !== undefined
        ? t('salta.prompt', { player: name(pending.by) })
        : ''
  view.saltaCall.hidden = solo || confirming
  view.saltaWaive.hidden = solo || confirming
  view.saltaCall.disabled = solo || pending === undefined
  view.saltaWaive.disabled = solo || pending === undefined
  view.restartStart.hidden = !confirming
  view.restartKeep.hidden = !confirming

  // Values sit in fixed-width slots so the panel never reflows as counts grow.
  const cell = (player: 'green' | 'red', value: number) =>
    `<dd class="count" data-player="${player}"><span class="swatch"></span>${value}</dd>`
  // What each side still owes is what the tournament rule scores at its limit.
  // Outside a tournament nothing counts it, and a number that large next to the
  // moves played reads as a budget rather than as a distance.
  const limit = state.tournament
    ? ` <small>${t('status.limit', { limit: TOURNAMENT_MOVE_LIMIT })}</small>`
    : ''
  view.status.innerHTML = [
    `<dt>${t('status.moves')}${limit}</dt>`,
    cell('green', state.moveCount.green),
    cell('red', state.moveCount.red),
    ...(state.tournament
      ? [
          `<dt>${t('status.remaining')}</dt>`,
          cell('green', movesRemaining(state.position, 'green')),
          cell('red', movesRemaining(state.position, 'red')),
        ]
      : []),
  ].join('')
}
