<template>
  <div v-if="box" class="preview-row">
    <div class="photo-choice">
      <div
        class="preview-outer"
        :class="{ 'is-selected': effectiveSource === 'cropped' }"
        @click="selectSource('cropped')"
      >
        <div class="preview-wrap" :style="frameStyle">
          <img :src="store.groupPhotoDataUrl" class="preview-img" :style="imgStyle" />
        </div>
      </div>
      <span class="text-caption">Cropped</span>
    </div>

    <div class="photo-choice">
      <div
        class="preview-outer"
        :class="{
          'is-selected': effectiveSource === 'excel',
          'is-disabled': !assignedMember?.photoDataUrl,
        }"
        @click="assignedMember?.photoDataUrl && selectSource('excel')"
      >
        <img
          v-if="assignedMember?.photoDataUrl"
          :src="assignedMember.photoDataUrl"
          class="excel-photo"
        />
        <div v-else class="excel-photo-placeholder">
          <v-icon icon="mdi-account-question" size="48" />
          <span class="text-caption">{{ assignedMember ? 'No photo' : 'No member assigned' }}</span>
        </div>
      </div>
      <span class="text-caption">Excel photo</span>
    </div>
  </div>
  <p v-else class="text-body-2">No face selected.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'

const store = useAnnotationStore()
const box = computed(() => store.selectedBox)
// The Excel-sourced reference photo for whoever is currently assigned to
// this box, shown alongside the cropped group-photo face so the two can be
// compared by eye to confirm the match, and picked as this box's export
// photo (see photoSource on FaceBox).
const assignedMember = computed(() => store.members.find((m) => m.id === box.value?.memberId))
const effectiveSource = computed(() => box.value?.photoSource ?? 'cropped')

function selectSource(source: 'cropped' | 'excel') {
  if (box.value) store.setBoxPhotoSource(box.value.id, source)
}

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
const MAX_SIZE = 140

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
.preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.photo-choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.preview-outer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 140px;
  padding: 3px;
  border-radius: 6px;
  box-shadow: 0 0 0 2px transparent;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.preview-outer.is-selected {
  box-shadow: 0 0 0 3px #2196f3;
}
.preview-outer.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.preview-wrap {
  position: relative;
  overflow: hidden;
  border: 2px solid #9e9e9e;
  border-radius: 4px;
  background: #eee;
}
.preview-img {
  position: absolute;
  max-width: none;
}
.excel-photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 2px solid #9e9e9e;
  border-radius: 4px;
  background: #eee;
}
.excel-photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  border: 2px dashed #9e9e9e;
  border-radius: 4px;
  background: #eee;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
  padding: 8px;
}
</style>
