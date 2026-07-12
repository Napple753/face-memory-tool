<template>
  <v-app>
    <v-app-bar title="Face Memory Tool">
      <template #append>
        <v-btn variant="text" prepend-icon="mdi-download" @click="onExport">
          Export progress
        </v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <v-container>
        <v-alert v-if="autoSaveFailed" type="warning" density="compact" class="mb-4" closable>
          Auto-save to browser storage failed (it may be full). Export your progress as JSON
          regularly to avoid losing work.
        </v-alert>
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from './stores/annotationStore'
import { downloadProgressJson, loadProgress, saveProgress } from './utils/progress-storage'

const router = useRouter()
const store = useAnnotationStore()
const autoSaveFailed = ref(false)

onMounted(async () => {
  await router.isReady()

  const saved = loadProgress()
  if (saved) {
    store.restoreState(saved)
    if (saved.groupPhotoDataUrl && router.currentRoute.value.path === '/') {
      router.replace('/annotate')
    }
  }

  store.$subscribe(() => {
    autoSaveFailed.value = !saveProgress(store.exportState())
  })
})

function onExport() {
  downloadProgressJson(store.exportState())
}
</script>
