<template>
  <div v-if="box">
    <p class="text-caption mb-1">
      Box: ({{ box.x }}, {{ box.y }}) &mdash; {{ box.w }}&times;{{ box.h }}
    </p>
    <p class="text-caption mb-2">Drag the box on the photo to reposition it.</p>
    <v-slider
      :model-value="box.w"
      :max="store.groupPhotoWidth"
      min="5"
      step="1"
      label="W"
      thumb-label
      density="compact"
      @update:model-value="(v: number) => update({ w: Math.round(v) })"
    />
    <v-slider
      :model-value="box.h"
      :max="store.groupPhotoHeight"
      min="5"
      step="1"
      label="H"
      thumb-label
      density="compact"
      @update:model-value="(v: number) => update({ h: Math.round(v) })"
    />
  </div>
  <p v-else class="text-body-2">Select a box to adjust its size.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'

const store = useAnnotationStore()
const box = computed(() => store.selectedBox)

function update(partial: Partial<{ x: number; y: number; w: number; h: number }>) {
  if (!box.value) return
  store.updateBoxPosition(box.value.id, {
    x: box.value.x,
    y: box.value.y,
    w: box.value.w,
    h: box.value.h,
    ...partial,
  })
}
</script>
