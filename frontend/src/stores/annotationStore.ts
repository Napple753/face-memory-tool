// Pinia store: single source of truth for members, boxes, and column mapping.

import { defineStore } from 'pinia'
import type { ColumnMapping, ExcelRow, FaceBox, Member } from '../types'

export const useAnnotationStore = defineStore('annotation', {
  state: () => ({
    excelColumns: [] as string[],
    excelRows: [] as ExcelRow[],
    photoMatches: {} as Record<string, string | null>,
    groupPhotoDataUrl: '' as string,
    columnMapping: null as ColumnMapping | null,
    members: [] as Member[],
    boxes: [] as FaceBox[],
  }),
  actions: {
    setExcelData(columns: string[], rows: ExcelRow[], photoMatches: Record<string, string | null>) {
      this.excelColumns = columns
      this.excelRows = rows
      this.photoMatches = photoMatches
    },
    setGroupPhoto(dataUrl: string) {
      this.groupPhotoDataUrl = dataUrl
    },
    fixPhotoMatch(rowId: string, dataUrl: string | null) {
      this.photoMatches = { ...this.photoMatches, [rowId]: dataUrl }
      const member = this.members.find((m) => m.id === rowId)
      if (member) member.photoDataUrl = dataUrl ?? undefined
    },
    applyColumnMapping(mapping: ColumnMapping) {
      this.columnMapping = mapping
      this.members = this.excelRows.map((row) => {
        const answerText = mapping.answerColumns
          .map((col) => row.cells[col])
          .filter((value) => value !== null && value !== undefined && value !== '')
          .join(mapping.answerSeparator)
        return {
          id: row.id,
          name: String(row.cells[mapping.nameColumn] ?? ''),
          division: String(row.cells[mapping.divisionColumn] ?? ''),
          answerText,
          photoDataUrl: this.photoMatches[row.id] ?? undefined,
        }
      })
    },
  },
})
