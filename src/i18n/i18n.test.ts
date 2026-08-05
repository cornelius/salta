import { describe, expect, it } from 'vitest'
import { de } from './de'
import { en } from './en'
import { LOCALES, translator } from './index'

describe('the message catalogues', () => {
  it('cover exactly the same keys', () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort())
  })

  it('use the same placeholders in every locale', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(de[key]), `placeholders in ${key}`).toEqual(placeholders(en[key]))
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
