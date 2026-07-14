<template>
  <div>
    <h1 class="text-h5 mb-4">Upload</h1>

    <v-file-input
      v-model="excelFile"
      label="Excel file (.xlsx)"
      accept=".xlsx"
      prepend-icon="mdi-file-excel"
      class="mb-2"
    />
    <v-file-input
      v-model="groupPhotoFile"
      label="Group photo"
      accept="image/*"
      prepend-icon="mdi-image"
      class="mb-2"
    />

    <v-alert v-if="error" type="error" class="mb-4" density="compact">{{ error }}</v-alert>

    <v-btn
      color="primary"
      :loading="loading"
      :disabled="!excelFile || !groupPhotoFile"
      @click="onContinue"
    >
      Continue
    </v-btn>

    <v-divider class="my-6" />

    <p class="text-body-2 mb-2">Already have a progress file from a previous session?</p>
    <v-file-input
      v-model="progressFile"
      label="Import progress JSON (optional)"
      accept="application/json"
      prepend-icon="mdi-file-restore"
      hide-details
      @update:model-value="onProgressFileSelected"
    />

    <v-dialog v-model="showOverwriteWarning" max-width="480">
      <v-card>
        <v-card-title>Overwrite current progress?</v-card-title>
        <v-card-text>
          Importing this file will replace any progress currently in this browser (uploaded
          Excel data, annotations, and boxes) and skip straight to annotation. This can't be
          undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelImport">Cancel</v-btn>
          <v-btn color="primary" @click="confirmImport">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadExcel } from '../utils/api'
import { parseProgressJson } from '../utils/progress-storage'
import { useAnnotationStore } from '../stores/annotationStore'
import type { ProgressExport } from '../types'

const router = useRouter()
const store = useAnnotationStore()

const excelFile = ref<File | null>(null)
const groupPhotoFile = ref<File | null>(null)
const loading = ref(false)
const error = ref('')

const progressFile = ref<File | null>(null)
const showOverwriteWarning = ref(false)
let pendingImport: ProgressExport | null = null

async function onProgressFileSelected(file: File[] | File | null) {
  const picked = Array.isArray(file) ? file[0] : file
  if (!picked) return
  try {
    pendingImport = parseProgressJson(await picked.text())
    showOverwriteWarning.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not read progress file'
    progressFile.value = null
  }
}

function cancelImport() {
  showOverwriteWarning.value = false
  pendingImport = null
  progressFile.value = null
}

function confirmImport() {
  if (!pendingImport) return
  store.restoreState(pendingImport)
  showOverwriteWarning.value = false
  router.push('/annotate')
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onContinue() {
  if (!excelFile.value || !groupPhotoFile.value) return
  loading.value = true
  error.value = ''
  try {
    const [parsed, photoDataUrl] = await Promise.all([
      uploadExcel(excelFile.value),
      readAsDataUrl(groupPhotoFile.value),
    ])
    store.setExcelData(parsed.columns, parsed.rows, parsed.photoMatches)
    store.setOriginalExcelFile(excelFile.value)
    store.setGroupPhoto(photoDataUrl)
    router.push('/mapping')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    loading.value = false
  }
}
</script>
