const darkModeQuery = '(prefers-color-scheme: dark)'

export function readSystemColorMode() {
  return window.matchMedia(darkModeQuery).matches ? 'dark' : 'light'
}

export function subscribeToColorMode(update: () => void) {
  const preference = window.matchMedia(darkModeQuery)
  preference.addEventListener('change', update)
  return () => preference.removeEventListener('change', update)
}

export function followSystemColorMode() {
  const update = () => {
    const dark = readSystemColorMode() === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('theme-dark', dark)
  }
  update()
  return subscribeToColorMode(update)
}
