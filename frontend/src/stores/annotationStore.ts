// Pinia store: single source of truth for members, boxes, and column mapping.

import { defineStore } from 'pinia'
import type { ColumnMapping, DetectedBox, ExcelRow, FaceBox, Member } from '../types'

export const useAnnotationStore = defineStore('annotation', {
  state: () => ({
    excelColumns: [] as string[],
    excelRows: [] as ExcelRow[],
    photoMatches: {} as Record<string, string | null>,
    groupPhotoDataUrl: '' as string,
    groupPhotoWidth: 0,
    groupPhotoHeight: 0,
    columnMapping: null as ColumnMapping | null,
    members: [] as Member[],
    boxes: [] as FaceBox[],
    selectedBoxId: null as string | null,
  }),
  getters: {
    selectedBox: (state): FaceBox | null =>
      state.boxes.find((box) => box.id === state.selectedBoxId) ?? null,
    unassignedMembers: (state): Member[] =>
      state.members.filter((member) => !state.boxes.some((box) => box.memberId === member.id)),
  },
  actions: {
    setExcelData(columns: string[], rows: ExcelRow[], photoMatches: Record<string, string | null>) {
      this.excelColumns = columns
      this.excelRows = rows
      this.photoMatches = photoMatches
    },
    setGroupPhoto(dataUrl: string) {
      this.groupPhotoDataUrl = dataUrl
      this.groupPhotoWidth = 0
      this.groupPhotoHeight = 0
      this.boxes = []
      this.selectedBoxId = null
    },
    setGroupPhotoDimensions(width: number, height: number) {
      this.groupPhotoWidth = width
      this.groupPhotoHeight = height
    },
    setBoxesFromDetection(boxes: DetectedBox[]) {
      this.boxes = boxes.map((box) => ({
        id: crypto.randomUUID(),
        memberId: null,
        location: 'in-photo',
        ...box,
      }))
      this.selectedBoxId = null
    },
    selectBox(id: string | null) {
      this.selectedBoxId = id
    },
    addBox(box: DetectedBox) {
      const newBox: FaceBox = { id: crypto.randomUUID(), memberId: null, location: 'in-photo', ...box }
      this.boxes.push(newBox)
      this.selectedBoxId = newBox.id
    },
    removeBox(id: string) {
      this.boxes = this.boxes.filter((box) => box.id !== id)
      if (this.selectedBoxId === id) this.selectedBoxId = null
    },
    updateBoxPosition(id: string, pos: DetectedBox) {
      const box = this.boxes.find((b) => b.id === id)
      if (box) Object.assign(box, pos)
    },
    assignName(boxId: string, memberId: string | null) {
      const box = this.boxes.find((b) => b.id === boxId)
      if (!box) return
      if (memberId && this.boxes.some((b) => b.id !== boxId && b.memberId === memberId)) {
        return // guard: a member can only be assigned to one box
      }
      box.memberId = memberId
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
