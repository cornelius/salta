import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The readable texts are one sheet in several languages. Its shape and its two
 * figures belong to the sheet rather than to whoever translated it: a section
 * quietly dropped, or a figure with a piece moved in it, is the kind of defect
 * that reads perfectly well and is wrong.
 */
const LANGUAGES = ['de', 'en', 'nb'] as const

/** The German transcription is the one the others are measured against. */
const SOURCE = 'de'

function text(language: string): string {
  return readFileSync(resolve(import.meta.dirname, '../docs', `rules.${language}.md`), 'utf8')
}

function headings(source: string): string[] {
  return source
    .split('\n')
    .filter((line) => line.startsWith('#'))
    .map((line) => line.slice(0, line.indexOf(' ')))
}

function figures(source: string): string[] {
  return source.split('\n').filter((line) => line.startsWith('|'))
}

describe('the readable rules', () => {
  it('are built the same way in every language', () => {
    for (const language of LANGUAGES) {
      expect(headings(text(language)), language).toEqual(headings(text(SOURCE)))
    }
  })

  it('carry the printed figures unchanged, a diagram being nobody`s to translate', () => {
    for (const language of LANGUAGES) {
      expect(figures(text(language)), language).toEqual(figures(text(SOURCE)))
    }
  })
})
