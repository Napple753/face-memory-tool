<template>
  <div>
    <h1 class="text-h5 mb-4">Missing members</h1>

    <v-alert v-if="!store.groupPhotoDataUrl" type="warning" density="compact">
      No group photo loaded. Go back and upload one first.
    </v-alert>

    <template v-else>
      <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

      <v-alert v-if="missingMembers.length === 0" type="success" density="compact" class="mb-4">
        Everyone was found in the group photo -- no bottom grid needed.
      </v-alert>

      <template v-else>
        <p class="text-body-2 mb-2">
          These members weren't matched to a face in the group photo. Upload a photo for
          anyone missing one below -- everyone else falls back to a placeholder.
        </p>
        <v-row>
          <v-col v-for="member in missingMembers" :key="member.id" cols="12" sm="6" md="4" lg="3">
            <v-card>
              <v-img v-if="photoFor(member)" :src="photoFor(member)" height="120" cover />
              <div
                v-else
                class="d-flex align-center justify-center bg-grey-lighten-2"
                style="height: 120px"
              >
                <v-icon icon="mdi-account-question" size="40" />
              </div>
              <v-card-title class="text-body-1">{{ member.name || '(no name)' }}</v-card-title>
              <v-card-subtitle>{{ member.division }}</v-card-subtitle>
              <v-card-actions>
                <v-file-input
                  density="compact"
                  variant="underlined"
                  accept="image/*"
                  label="Upload photo"
                  hide-details
                  @update:model-value="(files: File[] | File | null) => onUploadPhoto(member.id, files)"
                />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-text-field
          v-model.number="rows"
          type="number"
          min="1"
          label="Grid rows"
          style="max-width: 160px"
          class="mt-4"
          hide-details
        />
      </template>

      <v-btn class="mt-4" :loading="generating" @click="regenerate">
        {{ compositeResult ? 'Regenerate preview' : 'Generate preview' }}
      </v-btn>

      <template v-if="compositeResult">
        <h2 class="text-h6 mt-6 mb-2">Preview</h2>
        <img
          :src="compositeResult.compositeImageDataUrl"
          style="max-width: 100%; border: 1px solid #ccc"
        />

        <div class="mt-4">
          <v-btn color="primary" @click="finalize">Finalize and continue</v-btn>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from '../stores/annotationStore'
import { composite } from '../utils/api'
import type { CompositeResult, Member } from '../types'

const router = useRouter()
const store = useAnnotationStore()

const missingMembers = computed(() => store.missingMembers)
const rows = ref<number | null>(null)
const generating = ref(false)
const error = ref('')
const compositeResult = ref<CompositeResult | null>(null)

function photoFor(member: Member): string | undefined {
  return store.missingPhotoOverrides[member.id] ?? member.photoDataUrl
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onUploadPhoto(memberId: string, files: File[] | File | null) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return
  store.setMissingPhotoOverride(memberId, await readAsDataUrl(file))
}

// Target grid thumbnail size: match the average size of the in-photo face
// boxes, so the bottom grid looks visually consistent with the annotated faces.
function averageInPhotoBoxSize(): { thumbWidth: number; thumbHeight: number } | null {
  const inPhoto = store.boxes.filter((box) => box.location === 'in-photo')
  if (!inPhoto.length) return null
  const w = inPhoto.reduce((sum, box) => sum + box.w, 0) / inPhoto.length
  const h = inPhoto.reduce((sum, box) => sum + box.h, 0) / inPhoto.length
  return { thumbWidth: Math.round(w), thumbHeight: Math.round(h) }
}

async function regenerate() {
  if (!store.groupPhotoDataUrl) return
  generating.value = true
  error.value = ''
  try {
    const result = await composite({
      groupPhotoDataUrl: store.groupPhotoDataUrl,
      missingMembers: missingMembers.value.map((m) => ({
        id: m.id,
        name: m.name,
        photoDataUrl: photoFor(m),
      })),
      rows: rows.value,
      ...averageInPhotoBoxSize(),
    })
    compositeResult.value = result
    rows.value = result.rows || null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not build preview'
  } finally {
    generating.value = false
  }
}

function finalize() {
  if (compositeResult.value) store.applyComposite(compositeResult.value)
  router.push('/export')
}

onMounted(() => {
  if (store.groupPhotoDataUrl) regenerate()
})
</script>
