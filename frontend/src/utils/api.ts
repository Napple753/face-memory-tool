// Typed wrapper around backend calls: uploadExcel, uploadPhoto,
// detectFaces, composite, exportHtml, exportExcel.

import type {
  CompositeMemberInput,
  CompositeResult,
  DetectedBox,
  ExcelParseResult,
  ExportMemberInput,
} from '../types'

export async function uploadExcel(file: File): Promise<ExcelParseResult> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/upload/excel', {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Upload failed (${response.status})`)
  }
  return response.json()
}

export async function detectFaces(photoDataUrl: string): Promise<DetectedBox[]> {
  const blob = await (await fetch(photoDataUrl)).blob()
  const formData = new FormData()
  formData.append('file', blob, 'group-photo.jpg')
  const response = await fetch('/api/detect-faces', {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Face detection failed (${response.status})`)
  }
  const data = await response.json()
  return data.boxes
}

export async function composite(payload: {
  groupPhotoDataUrl: string
  missingMembers: CompositeMemberInput[]
  rows: number | null
  thumbWidth?: number
  thumbHeight?: number
}): Promise<CompositeResult> {
  const response = await fetch('/api/composite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Composite failed (${response.status})`)
  }
  return response.json()
}

export async function exportHtml(payload: {
  title: string
  compositeImageDataUrl: string
  imageWidth: number
  imageHeight: number
  members: ExportMemberInput[]
}): Promise<string> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Export failed (${response.status})`)
  }
  return response.text()
}

export interface PhotoReplacement {
  sheetName: string
  rowIndex: number
  x: number
  y: number
  w: number
  h: number
}

export interface ExcelExportResult {
  blob: Blob
  replacedCount: number
  requestedCount: number
}

export async function exportExcel(
  originalFile: File,
  metadata: {
    photoColumn?: string
    groupPhotoDataUrl: string
    groupPhotoWidth: number
    groupPhotoHeight: number
    replacements: PhotoReplacement[]
  },
): Promise<ExcelExportResult> {
  const formData = new FormData()
  formData.append('file', originalFile)
  formData.append('metadata', JSON.stringify(metadata))
  const response = await fetch('/api/export/excel', {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Excel export failed (${response.status})`)
  }
  const [replacedCount, requestedCount] = (response.headers.get('X-Photos-Replaced') ?? '0/0')
    .split('/')
    .map(Number)
  return { blob: await response.blob(), replacedCount, requestedCount }
}
