// Continuous server-side auto-save (docker volume, survives restarts) +
// manual JSON export/import.
// Include formatVersion in exported JSON; increment on every format change.

import type { ProgressExport } from '../types'

export const FORMAT_VERSION = 3

export async function saveProgress(data: ProgressExport): Promise<boolean> {
  try {
    const res = await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function loadProgress(): Promise<ProgressExport | null> {
  try {
    const res = await fetch('/api/progress')
    if (!res.ok) return null
    const parsed = (await res.json()) as ProgressExport | null
    if (!parsed || parsed.formatVersion !== FORMAT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export async function clearProgress(): Promise<boolean> {
  try {
    const res = await fetch('/api/progress', { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
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
