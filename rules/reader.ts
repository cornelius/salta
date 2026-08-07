/**
 * The switch at the top of the rules page, and the two readable texts it shows.
 *
 * The facsimile is the sheet as it was printed, in Fraktur and in 1899 German,
 * which is not a thing everyone can read. The same rules transcribed, and the
 * same rules translated, come straight out of docs/ -- one text each, not a copy
 * of one -- and the page swaps between the three without going anywhere.
 */
import de from '../docs/rules.de.md?html'
import en from '../docs/rules.en.md?html'

const FACSIMILE = 'facsimile'

const READABLE: Record<string, { readonly html: string; readonly lang: string }> = {
  de: { html: de, lang: 'de' },
  en: { html: en, lang: 'en' },
}

const facsimile = document.querySelector<HTMLElement>('#facsimile')
const reader = document.querySelector<HTMLElement>('#reader')
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')]

function show(view: string): void {
  const readable = READABLE[view]
  if (facsimile !== null) facsimile.hidden = readable !== undefined
  if (reader !== null) {
    reader.hidden = readable === undefined
    if (readable !== undefined) {
      reader.innerHTML = readable.html
      reader.lang = readable.lang
    }
  }
  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button.dataset.view === view))
  }
  // The reader may be several screens down from where the sheet was scrolled to.
  window.scrollTo({ top: 0 })
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    const view = button.dataset.view ?? FACSIMILE
    // In the address, so that a readable version can be the thing you send.
    window.history.replaceState(
      null,
      '',
      view === FACSIMILE ? window.location.pathname : `#${view}`,
    )
    show(view)
  })
}

const asked = window.location.hash.slice(1)
if (READABLE[asked] !== undefined) show(asked)
