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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadExcel } from '../utils/api'
import { useAnnotationStore } from '../stores/annotationStore'

const router = useRouter()
const store = useAnnotationStore()

const excelFile = ref<File | null>(null)
const groupPhotoFile = ref<File | null>(null)
const loading = ref(false)
const error = ref('')

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
    store.setGroupPhoto(photoDataUrl)
    router.push('/mapping')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    loading.value = false
  }
}
</script>
