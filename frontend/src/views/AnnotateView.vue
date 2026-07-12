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
            Click a box to select it. Click and drag on the photo to draw a new box.
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

          <SuggestionList class="mb-4" />

          <v-divider class="mb-4" />

          <BoxAdjustSliders />

          <v-btn color="primary" class="mt-4" @click="router.push('/missing')">Continue</v-btn>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from '../stores/annotationStore'
import { detectFaces } from '../utils/api'
import FaceBoxCanvas from '../components/FaceBoxCanvas.vue'
import BoxAdjustSliders from '../components/BoxAdjustSliders.vue'
import NameAutocomplete from '../components/NameAutocomplete.vue'
import SuggestionList from '../components/SuggestionList.vue'

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

onMounted(() => {
  if (store.groupPhotoDataUrl && store.boxes.length === 0) {
    runDetection()
  }
})
</script>
