import { describe, expect, it } from 'vitest'
import { escapeCsvValue, neutralizeSpreadsheetFormula } from './csv'

describe('neutralizeSpreadsheetFormula', () => {
  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1:A2)', '\t=1+1', '\r=1+1'])(
    'neutralizes a dangerous spreadsheet value: %s',
    (value) => {
      expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`)
    },
  )

  it('preserves ordinary user text', () => {
    expect(neutralizeSpreadsheetFormula('Biology')).toBe('Biology')
  })
})

describe('escapeCsvValue', () => {
  it('quotes values, escapes quotes, and neutralizes formulas', () => {
    expect(escapeCsvValue('A "quoted" subject')).toBe(
      '"A ""quoted"" subject"',
    )
    expect(escapeCsvValue('=IMPORTXML("https://example.com")')).toBe(
      '"\'=IMPORTXML(""https://example.com"")"',
    )
    expect(escapeCsvValue(null)).toBe('""')
  })
})
