// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The switch at the top of the rules page, driven from the address rather than
 * from a click. A fragment is a string from outside, and the page has to stand
 * whatever it says.
 *
 * The page is the shipped one rather than a copy of the parts this module
 * happens to reach for, so that renaming one of them in `index.html` fails here
 * instead of only in a browser. Its own script tags come out first: the module
 * under test is imported directly, and happy-dom would otherwise try to fetch
 * them and report the refusal for every case.
 */
const BODY = (() => {
  const html = readFileSync(resolve(import.meta.dirname, 'index.html'), 'utf8')
  const opening = /<body[^>]*>/.exec(html)
  const close = html.indexOf('</body>')
  if (opening === null || close < 0) throw new Error('no body in index.html')
  const open = opening.index + opening[0].length
  return html.slice(open, close).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
})()

function page(): void {
  document.body.innerHTML = BODY
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
