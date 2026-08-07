import { squareName } from '../core/board'
import { movesRemaining } from '../core/distance'
import {
  availableMoves,
  callSalta,
  type GameState,
  jumpIsCompulsory,
  newGame,
  play,
  TOURNAMENT_MOVE_LIMIT,
  waiveSalta,
} from '../core/game'
import { isJump } from '../core/rules'
import { targetPosition } from '../core/setup'
import { type Move, type Piece, pieceId, type Square } from '../core/types'
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
  readonly status: HTMLElement
  readonly tournament: HTMLInputElement
  readonly copy: HTMLInputElement
}

export function mount(root: HTMLElement): void {
  let locale = preferredLocale()
  let t = translator(locale)
  let state = newGame()
  let selected: Square | undefined
  let showCopy = preferredCopy()

  const chrome = () => ({ tournament: state.tournament, copy: showCopy })

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
    view.printing.innerHTML = boardMarkup(showCopy ? { marks: OWNER_MARKS } : {})
    view.target.innerHTML = targetMarkup(t, showCopy)
    for (const piece of view.pieces.values()) piece.remove()
    view.pieces.clear()
    render()
  }

  const start = (): void => {
    state = newGame({ tournament: view.tournament.checked })
    selected = undefined
    render()
  }

  function onSquare(sq: Square): void {
    if (state.outcome !== undefined) return
    const moves = availableMoves(state)
    if (selected !== undefined) {
      const move = moves.find((m) => m.from === selected && m.to === sq)
      if (move !== undefined) {
        state = play(state, move.from, move.to)
        selected = undefined
        render()
        return
      }
    }
    selected = moves.some((m) => m.from === sq) ? sq : undefined
    render()
  }

  function wire(): void {
    view.board.addEventListener('click', (event) => {
      const target = (event.target as Element).closest('[data-square]')
      const value = target?.getAttribute('data-square')
      if (value !== null && value !== undefined) onSquare(Number(value))
    })
    view.saltaCall.addEventListener('click', () => {
      state = callSalta(state)
      selected = undefined
      render()
    })
    view.saltaWaive.addEventListener('click', () => {
      state = waiveSalta(state)
      render()
    })
    view.tournament.addEventListener('change', start)
    view.copy.addEventListener('change', (event) => {
      setCopy((event.target as HTMLInputElement).checked)
    })
    root.querySelector('#new-game')?.addEventListener('click', start)
    root.querySelector('#locale')?.addEventListener('change', (event) => {
      setLocale((event.target as HTMLSelectElement).value as Locale)
    })
  }

  function render(): void {
    drawPieces(view, state, t, showCopy)
    drawHints(view, state, selected)
    drawStatus(view, state, t)
  }

  wire()
  render()
}

interface Chrome {
  readonly tournament: boolean
  readonly copy: boolean
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
        <g id="printing">${boardMarkup(chrome.copy ? { marks: OWNER_MARKS } : {})}</g>
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
          </div>
        </div>

        <dl class="status" id="status"></dl>

        <figure class="target" id="target">${targetMarkup(t, chrome.copy)}</figure>

        <div class="controls">
          <button type="button" class="button" id="new-game">${t('control.newGame')}</button>
          <label class="field checkbox"
                 title="${t('control.tournamentHint', { limit: TOURNAMENT_MOVE_LIMIT })}">
            <input type="checkbox" id="tournament"${checked(chrome.tournament)} />
            <span>${t('control.tournament')}</span>
          </label>
          <label class="field checkbox" title="${t('control.copyHint')}">
            <input type="checkbox" id="copy"${checked(chrome.copy)} />
            <span>${t('control.copy')}</span>
          </label>
        </div>
      </aside>
    </main>`
}

/**
 * The board as it looks when both sides are home, small, in the panel. Which
 * device stands in which row, in what order, and which way a side is going are
 * all things a player has to hold in their head otherwise, and the sheet answers
 * them with a figure rather than with a sentence.
 */
function targetMarkup(t: Translate, showCopy: boolean): string {
  return (
    `<figcaption>${t('status.target')}</figcaption>` +
    `<svg class="target-board" viewBox="0 0 ${BOARD_SIZE} ${BOARD_SIZE}" role="img" ` +
    `aria-label="${t('a11y.target')}">` +
    // No maker's mark: at this size it is a smudge in the margin.
    `${diagramMarkup(targetPosition(), {
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
    status: need('#status'),
    tournament: need<HTMLInputElement>('#tournament'),
    copy: need<HTMLInputElement>('#copy'),
  }
}

function drawPieces(view: View, state: GameState, t: Translate, showCopy: boolean): void {
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
    const { x, y } = squareOrigin(sq)
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

function drawHints(view: View, state: GameState, selected: Square | undefined): void {
  const shapes: string[] = []
  const moves = availableMoves(state)

  // Every mark lies over a square and takes the clicks meant for it, so each one
  // names the square it covers: a dot marking a destination has to be a way of
  // reaching it, not a hole in the board.
  if (selected !== undefined) {
    const { x, y } = squareOrigin(selected)
    shapes.push(
      `<rect class="hint-selected" data-square="${selected}" ` +
        `x="${x}" y="${y}" width="${CELL}" height="${CELL}"/>`,
    )
    for (const move of moves.filter((m: Move) => m.from === selected)) {
      const to = squareOrigin(move.to)
      shapes.push(
        `<circle class="hint-move${isJump(move) ? ' hint-jump' : ''}" data-square="${move.to}" ` +
          `cx="${to.x + CELL / 2}" cy="${to.y + CELL / 2}" r="16"/>`,
      )
      // Mark the piece being jumped, so the reason for the long move is visible.
      if (move.over !== undefined) {
        const over = squareOrigin(move.over)
        shapes.push(
          `<rect class="hint-over" data-square="${move.over}" ` +
            `x="${over.x}" y="${over.y}" width="${CELL}" height="${CELL}"/>`,
        )
      }
    }
  }
  view.hints.innerHTML = shapes.join('')
}

function drawStatus(view: View, state: GameState, t: Translate): void {
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

  const pending = state.missedJump
  view.notice.dataset.open = pending === undefined ? 'no' : 'yes'
  view.noticeText.textContent =
    pending === undefined ? '' : t('salta.prompt', { player: name(pending.by) })
  view.saltaCall.disabled = pending === undefined
  view.saltaWaive.disabled = pending === undefined

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
