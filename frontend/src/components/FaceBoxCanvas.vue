<template>
  <div
    ref="wrapRef"
    class="canvas-wrap"
    @mousedown="onWrapMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  >
    <img
      ref="imgRef"
      :src="store.groupPhotoDataUrl"
      class="canvas-img"
      draggable="false"
      @load="onImageLoad"
    />
    <div
      v-for="box in store.boxes"
      :key="box.id"
      class="face-box"
      :class="{
        selected: box.id === store.selectedBoxId,
        assigned: !!box.memberId,
        unassigned: !box.memberId,
        dragging: draggingBoxId === box.id,
      }"
      :style="boxStyle(box)"
      @mousedown.stop.prevent="onBoxMouseDown(box.id, $event)"
    >
      <span class="face-box-label">{{ labelFor(box) }}</span>
      <button
        v-if="box.id === store.selectedBoxId"
        type="button"
        class="face-box-delete"
        title="Delete box"
        @mousedown.stop
        @click.stop="store.removeBox(box.id)"
      >
        &times;
      </button>
    </div>
    <div v-if="draftBox" class="face-box draft" :style="boxStyle(draftBox)" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'
import type { FaceBox } from '../types'

const store = useAnnotationStore()

const wrapRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const draftBox = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const draggingBoxId = ref<string | null>(null)

// The image's rendered width, tracked reactively via ResizeObserver rather
// than read imperatively from clientWidth -- a plain property read isn't a
// reactive dependency, so on initial load (before layout settles) or after
// a window/container resize, box positions would otherwise stay computed
// against a stale width until some unrelated store change forced a re-render.
const renderedWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

let dragStart: { x: number; y: number } | null = null
let dragBoxStart: { x: number; y: number } | null = null
let dragPointerStart: { x: number; y: number } | null = null

function onImageLoad() {
  if (imgRef.value) {
    store.setGroupPhotoDimensions(imgRef.value.naturalWidth, imgRef.value.naturalHeight)
    renderedWidth.value = imgRef.value.clientWidth
  }
}

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (imgRef.value) renderedWidth.value = imgRef.value.clientWidth
  })
  if (imgRef.value) resizeObserver.observe(imgRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

function scale(): number {
  if (!imgRef.value?.naturalWidth || !renderedWidth.value) return 1
  return renderedWidth.value / imgRef.value.naturalWidth
}

function toImageCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = wrapRef.value!.getBoundingClientRect()
  const s = scale()
  const width = imgRef.value?.naturalWidth ?? 0
  const height = imgRef.value?.naturalHeight ?? 0
  const x = Math.min(Math.max((clientX - rect.left) / s, 0), width)
  const y = Math.min(Math.max((clientY - rect.top) / s, 0), height)
  return { x, y }
}

function onBoxMouseDown(id: string, event: MouseEvent) {
  store.selectBox(id)
  const box = store.boxes.find((b) => b.id === id)
  if (!box) return
  draggingBoxId.value = id
  dragBoxStart = { x: box.x, y: box.y }
  dragPointerStart = toImageCoords(event.clientX, event.clientY)
}

function onWrapMouseDown(event: MouseEvent) {
  store.selectBox(null)
  dragStart = toImageCoords(event.clientX, event.clientY)
  draftBox.value = { x: dragStart.x, y: dragStart.y, w: 0, h: 0 }
}

function onMouseMove(event: MouseEvent) {
  if (draggingBoxId.value) {
    const box = store.boxes.find((b) => b.id === draggingBoxId.value)
    if (!box || !dragBoxStart || !dragPointerStart) return
    const current = toImageCoords(event.clientX, event.clientY)
    const maxX = Math.max(0, store.groupPhotoWidth - box.w)
    const maxY = Math.max(0, store.groupPhotoHeight - box.h)
    const x = Math.min(Math.max(dragBoxStart.x + (current.x - dragPointerStart.x), 0), maxX)
    const y = Math.min(Math.max(dragBoxStart.y + (current.y - dragPointerStart.y), 0), maxY)
    store.updateBoxPosition(box.id, { x: Math.round(x), y: Math.round(y), w: box.w, h: box.h })
    return
  }
  if (!dragStart) return
  const current = toImageCoords(event.clientX, event.clientY)
  draftBox.value = {
    x: Math.min(dragStart.x, current.x),
    y: Math.min(dragStart.y, current.y),
    w: Math.abs(current.x - dragStart.x),
    h: Math.abs(current.y - dragStart.y),
  }
}

function onMouseUp() {
  if (draftBox.value && draftBox.value.w > 8 && draftBox.value.h > 8) {
    store.addBox({
      x: Math.round(draftBox.value.x),
      y: Math.round(draftBox.value.y),
      w: Math.round(draftBox.value.w),
      h: Math.round(draftBox.value.h),
    })
  }
  dragStart = null
  draftBox.value = null
  draggingBoxId.value = null
  dragBoxStart = null
  dragPointerStart = null
}

function boxStyle(box: { x: number; y: number; w: number; h: number }) {
  const s = scale()
  return {
    left: `${box.x * s}px`,
    top: `${box.y * s}px`,
    width: `${box.w * s}px`,
    height: `${box.h * s}px`,
  }
}

function labelFor(box: FaceBox): string {
  if (!box.memberId) return ''
  return store.members.find((m) => m.id === box.memberId)?.name ?? ''
}
</script>

<style scoped>
.canvas-wrap {
  position: relative;
  display: inline-block;
  user-select: none;
}
.canvas-img {
  display: block;
  max-width: 100%;
}
.face-box {
  position: absolute;
  border: 2px solid #ff5252;
  box-sizing: border-box;
  cursor: grab;
}
.face-box.dragging {
  cursor: grabbing;
}
.face-box.unassigned {
  border-color: #ff5252;
}
.face-box.assigned {
  border-color: #4caf50;
}
.face-box.selected {
  border-color: #2196f3;
  border-width: 3px;
}
.face-box.draft {
  border-style: dashed;
  border-color: #2196f3;
}
.face-box-label {
  display: none;
  position: absolute;
  top: -22px;
  left: -2px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  padding: 1px 4px;
  white-space: nowrap;
}
.face-box.assigned:hover .face-box-label,
.face-box.assigned.selected .face-box-label {
  display: block;
}
.face-box-delete {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff5252;
  color: #fff;
  border: none;
  line-height: 18px;
  cursor: pointer;
}
</style>
