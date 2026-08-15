// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The switch at the top of the rules page, driven from the address rather than
 * from a click. A fragment is a string from outside, and the page has to stand
 * whatever it says.
 */

function page(): void {
  document.body.innerHTML = `
    <nav>
      <span id="views-label"></span>
      <button type="button" data-view="facsimile" aria-pressed="true"></button>
      <button type="button" data-view="de" aria-pressed="false"></button>
      <button type="button" data-view="en" aria-pressed="false"></button>
      <button type="button" data-view="nb" aria-pressed="false"></button>
    </nav>
    <div id="facsimile"></div>
    <article class="reader" id="reader" hidden></article>
  `
}

/** The page opens once per case, so the module runs its top-level code afresh. */
async function open(fragment: string): Promise<void> {
  window.location.hash = fragment
  page()
  vi.resetModules()
  await import('./reader')
}

function element(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`#${id}`)
  if (found === null) throw new Error(`no #${id}`)
  return found
}

describe('the rules page opened at a fragment', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('shows the readable text the fragment names', async () => {
    await open('#en')
    expect(element('reader').hidden).toBe(false)
    expect(element('facsimile').hidden).toBe(true)
    expect(element('reader').innerHTML.length).toBeGreaterThan(0)
  })

  it('leaves the sheet standing when there is no fragment', async () => {
    await open('')
    expect(element('facsimile').hidden).toBe(false)
    expect(element('reader').hidden).toBe(true)
  })

  it('leaves the sheet standing for a fragment naming no text', async () => {
    await open('#klingon')
    expect(element('facsimile').hidden).toBe(false)
    expect(element('reader').hidden).toBe(true)
  })

  // A plain index answers for what every object inherits, which once let these
  // through to be rendered as the string `undefined`.
  it.each(['constructor', '__proto__', 'toString', 'valueOf'])(
    'leaves the sheet standing for #%s, which names a property and not a text',
    async (inherited) => {
      await open(`#${inherited}`)
      expect(element('facsimile').hidden).toBe(false)
      expect(element('reader').hidden).toBe(true)
      expect(element('reader').innerHTML).toBe('')
    },
  )
})
