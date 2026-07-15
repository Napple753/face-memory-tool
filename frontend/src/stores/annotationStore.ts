// Pinia store: single source of truth for members, boxes, and column mapping.

import { defineStore } from 'pinia'
import type {
  ColumnMapping,
  CompositeResult,
  DetectedBox,
  ExcelRow,
  FaceBox,
  Member,
  ProgressExport,
} from '../types'
import { FORMAT_VERSION } from '../utils/progress-storage'

export const useAnnotationStore = defineStore('annotation', {
  state: () => ({
    excelColumns: [] as string[],
    excelRows: [] as ExcelRow[],
    photoMatches: {} as Record<string, string | null>,
    // The originally uploaded .xlsx, kept only so the export step can splice
    // recognized members' photos into it without rebuilding the workbook.
    // Not part of ProgressExport (a File can't be JSON-serialized) -- the
    // backend keeps its own copy instead, restored via App.vue on mount.
    originalExcelFile: null as File | null,
    groupPhotoDataUrl: '' as string,
    groupPhotoWidth: 0,
    groupPhotoHeight: 0,
    columnMapping: null as ColumnMapping | null,
    members: [] as Member[],
    boxes: [] as FaceBox[],
    selectedBoxId: null as string | null,
    missingPhotoOverrides: {} as Record<string, string>, // memberId -> manually uploaded photo, for the bottom grid
    finalCompositeImageDataUrl: '' as string, // group photo + bottom grid merged, from the last finalized composite
    finalCompositeWidth: 0,
    finalCompositeHeight: 0,
  }),
  getters: {
    selectedBox: (state): FaceBox | null =>
      state.boxes.find((box) => box.id === state.selectedBoxId) ?? null,
    // Not assigned to any box (in-photo or grid) -- used to prevent assigning
    // the same member twice anywhere.
    unassignedMembers: (state): Member[] =>
      state.members.filter((member) => !state.boxes.some((box) => box.memberId === member.id)),
    // Not found in the group photo specifically -- stays stable across
    // re-generating the bottom grid, unlike unassignedMembers.
    missingMembers: (state): Member[] =>
      state.members.filter(
        (member) => !state.boxes.some((box) => box.location === 'in-photo' && box.memberId === member.id),
      ),
    // Names that appear on more than one member row after column mapping --
    // surfaced as a warning since the UI otherwise assumes names are unique.
    duplicateNames: (state): string[] => {
      const counts = new Map<string, number>()
      for (const member of state.members) {
        const name = member.name.trim()
        if (!name) continue
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
    },
  },
  actions: {
    setExcelData(columns: string[], rows: ExcelRow[], photoMatches: Record<string, string | null>) {
      this.excelColumns = columns
      this.excelRows = rows
      this.photoMatches = photoMatches
    },
    setOriginalExcelFile(file: File) {
      this.originalExcelFile = file
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
    // On deleting the selected box, moves selection to the next face to the
    // right (by x position among in-photo boxes), or the previous one if the
    // deleted box was rightmost -- keeps annotating in a left-to-right sweep
    // without a re-click after every delete.
    removeBox(id: string) {
      const wasSelected = this.selectedBoxId === id
      const removedBox = this.boxes.find((box) => box.id === id)
      let nextSelection: string | null = null

      if (wasSelected && removedBox?.location === 'in-photo') {
        const ordered = this.boxes
          .filter((box) => box.location === 'in-photo')
          .slice()
          .sort((a, b) => a.x - b.x)
        const currentIndex = ordered.findIndex((box) => box.id === id)
        const remaining = ordered.filter((box) => box.id !== id)
        if (remaining.length) {
          nextSelection = (remaining[currentIndex] ?? remaining[remaining.length - 1]).id
        }
      }

      this.boxes = this.boxes.filter((box) => box.id !== id)
      if (wasSelected) this.selectedBoxId = nextSelection
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
    setMissingPhotoOverride(memberId: string, dataUrl: string | null) {
      const copy = { ...this.missingPhotoOverrides }
      if (dataUrl) copy[memberId] = dataUrl
      else delete copy[memberId]
      this.missingPhotoOverrides = copy
    },
    applyComposite(result: CompositeResult) {
      const inPhotoBoxes = this.boxes.filter((box) => box.location === 'in-photo')
      const gridBoxes: FaceBox[] = result.gridBoxes.map((box) => ({
        id: crypto.randomUUID(),
        memberId: box.memberId,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        location: box.location,
      }))
      this.boxes = [...inPhotoBoxes, ...gridBoxes]
      this.finalCompositeImageDataUrl = result.compositeImageDataUrl
      this.finalCompositeWidth = result.imageWidth
      this.finalCompositeHeight = result.imageHeight
    },
    exportState(): ProgressExport {
      return {
        formatVersion: FORMAT_VERSION,
        columnMapping: this.columnMapping,
        members: this.members,
        boxes: this.boxes,
        groupPhotoDataUrl: this.groupPhotoDataUrl,
        missingPhotoOverrides: this.missingPhotoOverrides,
        finalCompositeImageDataUrl: this.finalCompositeImageDataUrl,
        finalCompositeWidth: this.finalCompositeWidth,
        finalCompositeHeight: this.finalCompositeHeight,
        excelColumns: this.excelColumns,
        excelRows: this.excelRows,
      }
    },
    // Restores members/boxes/photo directly, bypassing the column-mapping
    // step -- the original excel FILE itself isn't part of the export (it's
    // fetched separately from server-side storage; see App.vue).
    restoreState(data: ProgressExport) {
      this.excelColumns = data.excelColumns ?? []
      this.excelRows = data.excelRows ?? []
      this.photoMatches = {}
      this.originalExcelFile = null
      this.columnMapping = data.columnMapping
      this.members = data.members
      this.boxes = data.boxes
      this.groupPhotoDataUrl = data.groupPhotoDataUrl
      this.groupPhotoWidth = 0
      this.groupPhotoHeight = 0
      this.selectedBoxId = null
      this.missingPhotoOverrides = data.missingPhotoOverrides ?? {}
      this.finalCompositeImageDataUrl = data.finalCompositeImageDataUrl ?? ''
      this.finalCompositeWidth = data.finalCompositeWidth ?? 0
      this.finalCompositeHeight = data.finalCompositeHeight ?? 0
    },
  },
})
