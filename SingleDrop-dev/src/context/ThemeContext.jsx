import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const THEMES = ['light', 'dark', 'rage']

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('single-drop-theme')
    if (THEMES.includes(saved)) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme !== 'light')
    localStorage.setItem('single-drop-theme', theme)
  }, [theme])

  const setTheme = (t) => {
    if (THEMES.includes(t)) setThemeState(t)
  }

  const cycle = () => {
    const i = THEMES.indexOf(theme)
    setThemeState(THEMES[(i + 1) % THEMES.length])
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycle, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
