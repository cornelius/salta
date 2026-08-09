import { describe, expect, it } from 'vitest'
import { de } from './de'
import { en } from './en'
import { LOCALES, type Locale, translator } from './index'
import { nb } from './nb'

/** Every catalogue that is translated from English, by the locale it answers to. */
const TRANSLATED: Partial<Record<Locale, Record<string, string>>> = { de, nb }

describe('the message catalogues', () => {
  it('cover exactly the same keys', () => {
    for (const [locale, catalogue] of Object.entries(TRANSLATED)) {
      expect(Object.keys(catalogue).sort(), locale).toEqual(Object.keys(en).sort())
    }
  })

  it('offer one for every locale, so none falls back to English', () => {
    expect([...LOCALES].sort()).toEqual(['en', ...Object.keys(TRANSLATED)].sort())
  })

  it('use the same placeholders in every locale', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [locale, catalogue] of Object.entries(TRANSLATED)) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(catalogue[key] ?? ''), `placeholders in ${locale} ${key}`).toEqual(
          placeholders(en[key]),
        )
      }
    }
  })

  it('leave no message empty', () => {
    for (const locale of LOCALES) {
      const t = translator(locale)
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(t(key).trim(), `${locale} ${key}`).not.toBe('')
      }
    }
  })
})

describe('substitution', () => {
  it('fills placeholders by name', () => {
    expect(translator('en')('turn.toMove', { player: 'Green' })).toBe('Green to move')
    expect(translator('de')('turn.toMove', { player: 'Grün' })).toBe('Grün ist am Zug')
  })

  it('leaves an unsupplied placeholder visible rather than blanking it', () => {
    expect(translator('en')('turn.toMove', {})).toBe('{player} to move')
  })
})
