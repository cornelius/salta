import { de } from './de'
import { en, type MessageKey } from './en'

export type Locale = 'en' | 'de'
export const LOCALES: readonly Locale[] = ['en', 'de']
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', de: 'Deutsch' }

const CATALOGUES: Record<Locale, Record<MessageKey, string>> = { en, de }
const STORAGE_KEY = 'salta.locale'

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value)
}

/** The locale to open with: a remembered choice, else the browser's, else English. */
export function preferredLocale(): Locale {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  if (isLocale(stored)) return stored
  for (const tag of globalThis.navigator?.languages ?? []) {
    const base = tag.split('-')[0]
    if (isLocale(base ?? null)) return base as Locale
  }
  return 'en'
}

export function rememberLocale(locale: Locale): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, locale)
}

export type Translate = (
  key: MessageKey,
  values?: Readonly<Record<string, string | number>>,
) => string

/**
 * A lookup bound to one locale. Placeholders are `{name}` and are substituted
 * positionally-free, so a translation may reorder them or leave one out.
 */
export function translator(locale: Locale): Translate {
  const catalogue = CATALOGUES[locale]
  return (key, values) => {
    const template = catalogue[key] ?? en[key]
    if (values === undefined) return template
    return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const value = values[name]
      return value === undefined ? whole : String(value)
    })
  }
}

export type { MessageKey }
