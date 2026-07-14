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
  columnMapping: ColumnMapping | null
  members: Member[]
  boxes: FaceBox[]
  groupPhotoDataUrl: string
  missingPhotoOverrides: Record<string, string>
  finalCompositeImageDataUrl: string
  finalCompositeWidth: number
  finalCompositeHeight: number
}

// Raw import data from the Excel upload step, before column mapping is applied.
// sheetName/sheetRowIndex identify this row's exact cell in the original
// uploaded file, so the export step can splice a replacement photo in
// without rebuilding the workbook -- see excel_parser.py's parse_excel().
export interface ExcelRow {
  id: string
  cells: Record<string, string | number | null>
  sheetName: string
  sheetRowIndex: number
}

export interface ExcelParseResult {
  columns: string[]
  rows: ExcelRow[]
  photoMatches: Record<string, string | null> // row id -> photo data URL
}

export interface GridBox {
  memberId: string
  x: number
  y: number
  w: number
  h: number
  location: 'bottom-grid' | 'placeholder'
}

export interface CompositeResult {
  compositeImageDataUrl: string
  imageWidth: number
  imageHeight: number
  rows: number
  gridBoxes: GridBox[]
}

export interface CompositeMemberInput {
  id: string
  name: string
  photoDataUrl?: string
}

export interface ExportMemberInput {
  id: string
  name: string
  division: string
  answerText: string
  x: number
  y: number
  w: number
  h: number
  location: FaceBox['location']
}
