// Shared TypeScript interfaces.

export interface Member {
  id: string // hidden internal ID
  name: string
  division: string
  answerText: string // combined columns, separator/line-break applied
  photoDataUrl?: string
}

export interface FaceBox {
  id: string
  memberId: string | null
  x: number
  y: number
  w: number
  h: number
  location: 'in-photo' | 'bottom-grid' | 'placeholder'
}

export interface DetectedBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ColumnMapping {
  nameColumn: string
  divisionColumn: string
  photoColumn?: string
  answerColumns: string[]
  answerSeparator: string
}

export interface ProgressExport {
  formatVersion: number // increment on every breaking change to this shape
  columnMapping: ColumnMapping
  members: Member[]
  boxes: FaceBox[]
}

// Raw import data from the Excel upload step, before column mapping is applied.
export interface ExcelRow {
  id: string
  cells: Record<string, string | number | null>
}

export interface ExcelParseResult {
  columns: string[]
  rows: ExcelRow[]
  photoMatches: Record<string, string | null> // row id -> photo data URL
}
