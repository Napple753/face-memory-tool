<template>
  <div>
    <h1 class="text-h5 mb-4">Annotate</h1>

    <v-alert v-if="!store.groupPhotoDataUrl" type="warning" density="compact">
      No group photo loaded. Go back and upload one first.
    </v-alert>

    <template v-else>
      <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

      <v-row>
        <v-col cols="12" md="8">
          <p class="text-body-2 mb-2">
            Click a box to select it, or drag it to reposition. Click and drag on empty
            photo area to draw a new box. Press Tab / Shift+Tab to jump between faces, left
            to right, and Delete / Backspace to remove the selected face.
          </p>
          <v-alert
            v-if="!detecting && detectionRan && store.boxes.length === 0"
            type="info"
            density="compact"
            class="mb-2"
          >
            No faces were automatically detected in this photo. Draw boxes manually by
            clicking and dragging on the photo below.
          </v-alert>
          <FaceBoxCanvas />
          <v-btn class="mt-4" :loading="detecting" @click="runDetection">
            {{ detectionRan ? 'Re-run face detection' : 'Detect faces' }}
          </v-btn>
        </v-col>

        <v-col cols="12" md="4">
          <p class="text-body-2 mb-2">
            {{ store.members.length - store.unassignedMembers.length }} / {{ store.members.length }}
            members assigned
          </p>

          <NameAutocomplete class="mb-4" />

          <SelectedBoxPreview />

          <v-divider class="mb-4" />

          <BoxAdjustSliders />

          <v-btn color="primary" class="mt-4" @click="router.push('/missing')">Continue</v-btn>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from '../stores/annotationStore'
import { detectFaces } from '../utils/api'
import FaceBoxCanvas from '../components/FaceBoxCanvas.vue'
import BoxAdjustSliders from '../components/BoxAdjustSliders.vue'
import NameAutocomplete from '../components/NameAutocomplete.vue'
import SelectedBoxPreview from '../components/SelectedBoxPreview.vue'

const router = useRouter()
const store = useAnnotationStore()
const detecting = ref(false)
const detectionRan = ref(false)
const error = ref('')

async function runDetection() {
  if (!store.groupPhotoDataUrl) return
  detecting.value = true
  error.value = ''
  try {
    const boxes = await detectFaces(store.groupPhotoDataUrl)
    store.setBoxesFromDetection(boxes)
    detectionRan.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Face detection failed'
  } finally {
    detecting.value = false
  }
}

// Left-to-right order, so Tab / Shift+Tab move through faces the same way
// you'd scan the photo. Captured at document level (capture phase) so it
// pre-empts both the browser's normal tab-order and Vuetify's own Tab
// handling inside the name field, letting Tab drive face-to-face navigation
// even while typing a name -- annotating 80+ people one by one.
function orderedInPhotoBoxes() {
  return store.boxes.filter((box) => box.location === 'in-photo').slice().sort((a, b) => a.x - b.x)
}

// True while the event target is a text field (the name autocomplete, most
// commonly) -- Backspace/Delete there must edit the typed text, not delete
// the selected face.
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()

    const ordered = orderedInPhotoBoxes()
    if (!ordered.length) return

    const currentIndex = ordered.findIndex((box) => box.id === store.selectedBoxId)
    let nextIndex: number
    if (currentIndex === -1) {
      nextIndex = event.shiftKey ? ordered.length - 1 : 0
    } else if (event.shiftKey) {
      nextIndex = (currentIndex - 1 + ordered.length) % ordered.length
    } else {
      nextIndex = (currentIndex + 1) % ordered.length
    }
    store.selectBox(ordered[nextIndex].id)
    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && store.selectedBoxId) {
    if (isEditableTarget(event.target)) return
    event.preventDefault()
    store.removeBox(store.selectedBoxId)
  }
}

onMounted(() => {
  if (store.groupPhotoDataUrl && store.boxes.length === 0) {
    runDetection()
  }
  window.addEventListener('keydown', onKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown, true)
})
</script>
