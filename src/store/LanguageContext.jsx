import { createContext, useContext, useState } from 'react'
import translations from '../i18n/translations'

const LanguageContext = createContext({ lang: 'it', setLang: () => {}, t: translations.it })

export const useLanguage = () => useContext(LanguageContext)
export const useT = () => useContext(LanguageContext).t

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'it')

  const setLang = (l) => {
    localStorage.setItem('lang', l)
    setLangState(l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}
