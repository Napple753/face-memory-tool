<template>
  <v-app>
    <v-app-bar title="Face Memory Tool">
      <template #append>
        <v-btn variant="text" prepend-icon="mdi-download" @click="onExport"> Export progress </v-btn>
        <v-btn variant="text" prepend-icon="mdi-delete-outline" @click="showResetWarning = true">
          Reset
        </v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <v-container>
        <v-alert v-if="autoSaveFailed" type="warning" density="compact" class="mb-4" closable>
          Auto-save failed (server unreachable or disk full). Export your progress as JSON
          regularly to avoid losing work.
        </v-alert>
        <router-view />
      </v-container>
    </v-main>

    <v-dialog v-model="showResetWarning" max-width="480">
      <v-card>
        <v-card-title>Delete all progress?</v-card-title>
        <v-card-text>
          This permanently deletes the saved session (uploaded Excel data, annotations, and
          boxes) from the server. This can't be undone -- export a JSON backup first if you're
          not sure.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showResetWarning = false">Cancel</v-btn>
          <v-btn color="error" @click="onReset">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from './stores/annotationStore'
import { clearProgress, downloadProgressJson, loadProgress, saveProgress } from './utils/progress-storage'

const router = useRouter()
const store = useAnnotationStore()
const autoSaveFailed = ref(false)
const showResetWarning = ref(false)

// Autosave fires on every store mutation (dragging a box, typing a name, ...);
// debounce so we're not shipping the full snapshot -- including embedded
// photo data URLs -- to the server on every keystroke.
let saveTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    autoSaveFailed.value = !(await saveProgress(store.exportState()))
  }, 800)
}

onMounted(async () => {
  await router.isReady()

  const saved = await loadProgress()
  if (saved) {
    store.restoreState(saved)
    if (saved.groupPhotoDataUrl && router.currentRoute.value.path === '/') {
      router.replace('/annotate')
    }
  }

  store.$subscribe(scheduleSave)
})

function onExport() {
  downloadProgressJson(store.exportState())
}

async function onReset() {
  showResetWarning.value = false
  clearTimeout(saveTimer)
  await clearProgress()
  store.$reset()
  autoSaveFailed.value = false
  router.push('/')
}
</script>
