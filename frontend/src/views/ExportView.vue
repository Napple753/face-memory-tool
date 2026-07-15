<template>
  <div>
    <h1 class="text-h5 mb-4">Export</h1>

    <v-alert v-if="!imageDataUrl" type="warning" density="compact">
      No group photo loaded. Go back and upload one first.
    </v-alert>

    <template v-else>
      <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

      <p class="text-body-2 mb-4">{{ exportMembers.length }} member(s) ready for export.</p>

      <v-text-field v-model="title" label="Title" style="max-width: 400px" class="mb-4" />

      <v-btn color="primary" :loading="generating" @click="onGenerate">
        Generate &amp; download HTML
      </v-btn>

      <v-alert v-if="downloadedOnce" type="success" density="compact" class="mt-4">
        Downloaded. Double-click the file to open it in a browser -- no server needed.
      </v-alert>

      <div class="mt-6">
        <v-btn
          v-if="canExportExcel"
          color="secondary"
          :loading="generatingExcel"
          @click="onGenerateExcel"
        >
          Download Excel (photos updated)
        </v-btn>
        <v-alert v-else-if="!hasOriginalExcel" type="info" density="compact">
          Excel download needs the originally uploaded Excel file, which isn't available yet.
          Upload it from the start to use this option.
        </v-alert>
        <v-alert v-else-if="!hasPhotoColumn" type="info" density="compact">
          Excel download needs a photo column -- go back to column mapping and set "Photo column"
          to enable this option.
        </v-alert>

        <v-alert v-if="excelError" type="error" density="compact" class="mt-4">{{ excelError }}</v-alert>
        <v-alert v-if="excelResultMessage" :type="excelResultType" density="compact" class="mt-4">
          {{ excelResultMessage }}
        </v-alert>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'
import { exportExcel, exportHtml, type PhotoReplacement } from '../utils/api'
import type { ExportMemberInput } from '../types'

const store = useAnnotationStore()
const title = ref('Team Faces')
const generating = ref(false)
const error = ref('')
const downloadedOnce = ref(false)
const generatingExcel = ref(false)
const excelError = ref('')
const excelResultMessage = ref('')
const excelResultType = ref<'success' | 'warning'>('success')

const hasOriginalExcel = computed(
  () => store.excelColumns.length > 0 && store.excelRows.length > 0 && !!store.originalExcelFile,
)
const hasPhotoColumn = computed(() => !!store.columnMapping?.photoColumn)
const canExportExcel = computed(() => hasOriginalExcel.value && hasPhotoColumn.value)

const excelPhotoReplacements = computed<PhotoReplacement[]>(() =>
  store.boxes.flatMap((box) => {
    if (box.location !== 'in-photo' || !box.memberId) return []
    const row = store.excelRows.find((r) => r.id === box.memberId)
    if (!row) return []
    return [
      {
        sheetName: row.sheetName,
        rowIndex: row.sheetRowIndex,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
      },
    ]
  }),
)

const imageDataUrl = computed(() => store.finalCompositeImageDataUrl || store.groupPhotoDataUrl)
const imageWidth = computed(() => store.finalCompositeWidth || store.groupPhotoWidth)
const imageHeight = computed(() => store.finalCompositeHeight || store.groupPhotoHeight)

const exportMembers = computed<ExportMemberInput[]>(() =>
  store.boxes.flatMap((box) => {
    const member = store.members.find((m) => m.id === box.memberId)
    if (!member) return []
    return [
      {
        id: member.id,
        name: member.name,
        division: member.division,
        answerText: member.answerText,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        location: box.location,
      },
    ]
  }),
)

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function onGenerate() {
  generating.value = true
  error.value = ''
  downloadedOnce.value = false
  try {
    const html = await exportHtml({
      title: title.value,
      compositeImageDataUrl: imageDataUrl.value,
      imageWidth: imageWidth.value,
      imageHeight: imageHeight.value,
      members: exportMembers.value,
    })
    const safeTitle = title.value.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'face-memory'
    downloadBlob(new Blob([html], { type: 'text/html' }), `${safeTitle}.html`)
    downloadedOnce.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Export failed'
  } finally {
    generating.value = false
  }
}

async function onGenerateExcel() {
  if (!store.originalExcelFile) return
  generatingExcel.value = true
  excelError.value = ''
  excelResultMessage.value = ''
  try {
    const result = await exportExcel(store.originalExcelFile, {
      photoColumn: store.columnMapping?.photoColumn,
      groupPhotoDataUrl: store.groupPhotoDataUrl,
      groupPhotoWidth: store.groupPhotoWidth,
      groupPhotoHeight: store.groupPhotoHeight,
      replacements: excelPhotoReplacements.value,
    })
    const safeTitle = title.value.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'members'
    downloadBlob(result.blob, `${safeTitle}.xlsx`)
    if (result.requestedCount === 0) {
      excelResultType.value = 'warning'
      excelResultMessage.value =
        'Downloaded, but no members are currently matched in the group photo, so no photos were changed.'
    } else if (result.replacedCount < result.requestedCount) {
      excelResultType.value = 'warning'
      excelResultMessage.value = `Downloaded. ${result.replacedCount} of ${result.requestedCount} detected members' photos were replaced -- the rest had no original photo in the spreadsheet to swap, so they're untouched.`
    } else {
      excelResultType.value = 'success'
      excelResultMessage.value = `Downloaded. This is the original Excel file with ${result.replacedCount} detected member(s)' photos swapped for the quiz crop -- everything else, including everyone else's photo, is untouched.`
    }
  } catch (e) {
    excelError.value = e instanceof Error ? e.message : 'Excel export failed'
  } finally {
    generatingExcel.value = false
  }
}
</script>
