import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { AppLocale } from '@shared/domain/types'
import { pl, type MessageCatalog } from './pl'
import { en } from './en'

const catalogs: Record<AppLocale, MessageCatalog> = { pl, en }

const I18nContext = createContext<{
  locale: AppLocale
  t: MessageCatalog
  setLocale: (locale: AppLocale) => void
}>({
  locale: 'pl',
  t: pl,
  setLocale: () => undefined
})

export function I18nProvider({
  locale,
  setLocale,
  children
}: {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  children: ReactNode
}): React.JSX.Element {
  const value = useMemo(() => ({ locale, t: catalogs[locale], setLocale }), [locale, setLocale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): {
  locale: AppLocale
  t: MessageCatalog
  setLocale: (locale: AppLocale) => void
} {
  return useContext(I18nContext)
}
