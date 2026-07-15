// Renders an answer-text template against a row's cells.
// {{column_name}} is replaced by that column's value; ¥n becomes a line break.

import type { ExcelRow } from '../types'

export function renderAnswerTemplate(template: string, cells: ExcelRow['cells']): string {
  const withColumns = template.replace(/\{\{(.+?)\}\}/g, (_, col: string) => {
    const value = cells[col.trim()]
    return value === null || value === undefined ? '' : String(value)
  })
  return withColumns.replace(/¥n/g, '\n')
}
