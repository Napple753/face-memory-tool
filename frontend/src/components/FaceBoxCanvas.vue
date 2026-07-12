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
      :class="{ selected: box.id === store.selectedBoxId }"
      :style="boxStyle(box)"
      @mousedown.stop="onBoxMouseDown(box.id)"
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
import { ref } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'
import type { FaceBox } from '../types'

const store = useAnnotationStore()

const wrapRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const draftBox = ref<{ x: number; y: number; w: number; h: number } | null>(null)

let dragStart: { x: number; y: number } | null = null

function onImageLoad() {
  if (imgRef.value) {
    store.setGroupPhotoDimensions(imgRef.value.naturalWidth, imgRef.value.naturalHeight)
  }
}

function scale(): number {
  if (!imgRef.value || !imgRef.value.naturalWidth) return 1
  return imgRef.value.clientWidth / imgRef.value.naturalWidth
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

function onBoxMouseDown(id: string) {
  store.selectBox(id)
}

function onWrapMouseDown(event: MouseEvent) {
  store.selectBox(null)
  dragStart = toImageCoords(event.clientX, event.clientY)
  draftBox.value = { x: dragStart.x, y: dragStart.y, w: 0, h: 0 }
}

function onMouseMove(event: MouseEvent) {
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
  cursor: pointer;
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
  position: absolute;
  top: -22px;
  left: -2px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  padding: 1px 4px;
  white-space: nowrap;
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
