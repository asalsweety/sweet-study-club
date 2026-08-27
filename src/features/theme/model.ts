export const themePresetOptions = [
  {
    value: 'sweet',
    label: 'Sweet Study',
    description: 'صورتی آرام و گرم',
    swatches: [
      'oklch(0.57 0.18 350)',
      'oklch(0.91 0.065 80)',
      'oklch(0.66 0.14 190)',
    ],
  },
  {
    value: 'bubblegum',
    label: 'Bubblegum',
    description: 'شاد، صورتی و آبی',
    swatches: [
      'oklch(0.6209 0.1801 348.1385)',
      'oklch(0.8095 0.0694 198.1863)',
      'oklch(0.9195 0.0801 87.667)',
    ],
  },
  {
    value: 'candyland',
    label: 'Candyland',
    description: 'آبنباتی و روشن',
    swatches: [
      'oklch(0.8677 0.0735 7.0855)',
      'oklch(0.8148 0.0819 225.7537)',
      'oklch(0.968 0.211 109.7692)',
    ],
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'نئونی و پرکنتراست',
    swatches: [
      'oklch(0.6726 0.2904 341.4084)',
      'oklch(0.8903 0.1739 171.269)',
      'oklch(0.9168 0.1915 101.407)',
    ],
  },
  {
    value: 'pastel-dreams',
    label: 'Pastel Dreams',
    description: 'بنفش ملایم و نرم',
    swatches: [
      'oklch(0.709 0.1592 293.5412)',
      'oklch(0.9073 0.053 306.0902)',
      'oklch(0.9376 0.026 321.9388)',
    ],
  },
  {
    value: 'vintage-paper',
    label: 'Vintage Paper',
    description: 'کاغذی، گرم و کلاسیک',
    swatches: [
      'oklch(0.618 0.0778 65.5444)',
      'oklch(0.8846 0.0302 85.5655)',
      'oklch(0.7264 0.0581 66.6967)',
    ],
  },
] as const

export type ThemePreset = (typeof themePresetOptions)[number]['value']
export type ColorMode = 'light' | 'dark'

const themeStorageKey = 'sweet-study-theme-preset'
const modeStorageKey = 'sweet-study-color-mode'

export function isThemePreset(value: string | null): value is ThemePreset {
  return themePresetOptions.some((option) => option.value === value)
}

export function readStoredThemePreset(): ThemePreset {
  const storedTheme = localStorage.getItem(themeStorageKey)
  return isThemePreset(storedTheme) ? storedTheme : 'sweet'
}

export function storeThemePreset(theme: ThemePreset) {
  localStorage.setItem(themeStorageKey, theme)
}

export function readStoredColorMode(): ColorMode {
  const storedMode = localStorage.getItem(modeStorageKey)

  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function storeColorMode(mode: ColorMode) {
  localStorage.setItem(modeStorageKey, mode)
}

export const themePresetClasses = themePresetOptions.map(
  (option) => `theme-${option.value}`,
)

export function applyThemeToDocument(
  preset: ThemePreset,
  mode: ColorMode,
) {
  const root = document.documentElement
  root.classList.remove(...themePresetClasses)
  root.classList.add('theme-preset', `theme-${preset}`)
  root.classList.toggle('theme-dark', mode === 'dark')
  root.style.colorScheme = mode

  const themeColor = getComputedStyle(root)
    .getPropertyValue('--background')
    .trim()
  const themeColorMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )

  if (themeColor && themeColorMeta) {
    themeColorMeta.content = themeColor
  }
}
