// Continuous localStorage auto-save + manual JSON export/import.
// Include formatVersion in exported JSON; increment on every format change.

import type { ProgressExport } from '../types'

const STORAGE_KEY = 'face-memory-tool:progress'
export const FORMAT_VERSION = 1

export function saveProgress(data: ProgressExport): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function loadProgress(): ProgressExport | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ProgressExport
    if (parsed.formatVersion !== FORMAT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function clearProgress() {
  localStorage.removeItem(STORAGE_KEY)
}

export function downloadProgressJson(data: ProgressExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `face-memory-progress-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function parseProgressJson(text: string): ProgressExport {
  const parsed = JSON.parse(text)
  if (typeof parsed.formatVersion !== 'number' || !Array.isArray(parsed.members) || !Array.isArray(parsed.boxes)) {
    throw new Error('This does not look like a Face Memory Tool progress file')
  }
  return parsed as ProgressExport
}
