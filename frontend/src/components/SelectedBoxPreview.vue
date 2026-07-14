<template>
  <div v-if="box" class="preview-outer">
    <div class="preview-wrap" :style="frameStyle">
      <img :src="store.groupPhotoDataUrl" class="preview-img" :style="imgStyle" />
    </div>
  </div>
  <p v-else class="text-body-2">No face selected.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'

const store = useAnnotationStore()
const box = computed(() => store.selectedBox)

// Zoomed-in crop of just the selected box, so the person you're currently
// naming/resizing is easy to recognize without hunting for their (possibly
// tiny or scrolled-off) box on the full group photo. The outer wrapper
// (.preview-outer) is a fixed, pre-determined area that never resizes, so
// dragging the W/H sliders right below it doesn't reflow the page out from
// under the cursor. The frame inside it (.preview-wrap) takes on the box's
// own W:H ratio (capped to MAX_SIZE on the longer side) rather than a fixed
// square, so the preview shows the box's full contents uncropped -- this is
// what lets you confirm the exact area that will be cropped for this
// person, instead of a "cover"-fit guess that could hide slivers of the box
// outside a fixed square.
const MAX_SIZE = 220

const scale = computed(() => {
  if (!box.value || !box.value.w || !box.value.h) return 0
  return Math.min(MAX_SIZE / box.value.w, MAX_SIZE / box.value.h)
})

const frameStyle = computed(() => {
  if (!box.value || !box.value.w || !box.value.h) return { width: `${MAX_SIZE}px`, height: `${MAX_SIZE}px` }
  const b = box.value
  return {
    width: `${b.w * scale.value}px`,
    height: `${b.h * scale.value}px`,
  }
})

const imgStyle = computed(() => {
  if (!box.value || !box.value.w || !box.value.h) return {}
  const b = box.value
  const s = scale.value
  return {
    width: `${store.groupPhotoWidth * s}px`,
    height: `${store.groupPhotoHeight * s}px`,
    left: `${-b.x * s}px`,
    top: `${-b.y * s}px`,
  }
})
</script>

<style scoped>
.preview-outer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 220px;
  margin-bottom: 16px;
}
.preview-wrap {
  position: relative;
  overflow: hidden;
  border: 2px solid #2196f3;
  border-radius: 4px;
  background: #eee;
}
.preview-img {
  position: absolute;
  max-width: none;
}
</style>
