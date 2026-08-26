const SPREADSHEET_FORMULA_PREFIX = /^[=+\-@\t\r]/

export function neutralizeSpreadsheetFormula(value: string) {
  return SPREADSHEET_FORMULA_PREFIX.test(value) ? `'${value}` : value
}

export function escapeCsvValue(value: string | number | null) {
  const text = value === null ? '' : String(value)
  const safeText = neutralizeSpreadsheetFormula(text)

  return `"${safeText.replaceAll('"', '""')}"`
}
