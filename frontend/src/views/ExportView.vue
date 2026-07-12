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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'
import { exportHtml } from '../utils/api'
import type { ExportMemberInput } from '../types'

const store = useAnnotationStore()
const title = ref('Team Faces')
const generating = ref(false)
const error = ref('')
const downloadedOnce = ref(false)

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

function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' })
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
    downloadHtmlFile(html, `${safeTitle}.html`)
    downloadedOnce.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Export failed'
  } finally {
    generating.value = false
  }
}
</script>
