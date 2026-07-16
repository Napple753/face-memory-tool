<template>
  <div>
    <h1 class="text-h5 mb-4">Column mapping</h1>

    <v-alert v-if="!store.excelColumns.length" type="warning" density="compact" class="mb-4">
      No Excel data loaded yet. Go back and upload a file first.
    </v-alert>

    <template v-else>
      <v-select v-model="nameColumn" :items="store.excelColumns" label="Name column" class="mb-2" />
      <v-select v-model="divisionColumn" :items="store.excelColumns" label="Division column" class="mb-2" />
      <v-select
        v-model="photoColumn"
        :items="store.excelColumns"
        label="Photo column (optional)"
        clearable
        class="mb-2"
      />
      <v-textarea
        v-model="answerTemplate"
        label="Answer text template"
        rows="3"
        hint="Use {{column_name}} to insert a column's value, and ¥n for a line break."
        persistent-hint
        class="mb-2"
      />
      <p class="text-caption mb-4">Available columns: {{ availableColumnHint }}</p>

      <v-btn color="primary" :disabled="!nameColumn || !divisionColumn" @click="buildMembers">
        Build member list
      </v-btn>

      <template v-if="store.members.length">
        <v-alert type="info" density="compact" class="mb-4">
          <div>{{ store.members.length }} member{{ store.members.length > 1 ? 's' : '' }} loaded.</div>
          <div v-if="store.usedSheets.length">
            Sheet{{ store.usedSheets.length > 1 ? 's' : '' }} used:
            {{ store.usedSheets.join(', ') }}.
          </div>
          <div v-if="store.unusedSheets.length">
            Sheet{{ store.unusedSheets.length > 1 ? 's' : '' }} not used (header didn't match):
            {{ store.unusedSheets.join(', ') }}.
          </div>
        </v-alert>

        <v-alert v-if="store.duplicateNames.length" type="warning" density="compact" class="mb-4">
          Duplicate member{{ store.duplicateNames.length > 1 ? 's' : '' }} found (same name AND
          same answer): {{ store.duplicateNames.join(', ') }}. They'll appear more than once,
          identically, in the name-assignment list during annotation, so it's easy to pick the
          wrong one -- consider fixing these rows in the spreadsheet and re-uploading. Rows that
          merely share a name but have different answers are fine and were left alone.
        </v-alert>

        <h2 class="text-h6 mt-6 mb-2">Photo match preview</h2>
        <p class="text-body-2 mb-4">
          Photos were auto-matched to rows by their position in the spreadsheet. Fix any
          wrong matches below.
        </p>
        <v-row>
          <v-col v-for="member in store.members" :key="member.id" cols="12" sm="6" md="4" lg="3">
            <v-card>
              <v-img v-if="member.photoDataUrl" :src="member.photoDataUrl" height="140" cover />
              <div v-else class="d-flex align-center justify-center bg-grey-lighten-2" style="height: 140px">
                <v-icon icon="mdi-account-question" size="48" />
              </div>
              <v-card-title class="text-body-1">{{ member.name || '(no name)' }}</v-card-title>
              <v-card-subtitle>{{ member.division }}</v-card-subtitle>
              <v-card-actions>
                <v-file-input
                  density="compact"
                  variant="underlined"
                  accept="image/*"
                  label="Change photo"
                  hide-details
                  @update:model-value="(files: File[] | File | null) => onFixPhoto(member.id, files)"
                />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-btn color="primary" class="mt-4" @click="router.push('/annotate')">Continue</v-btn>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from '../stores/annotationStore'

const router = useRouter()
const store = useAnnotationStore()

const nameColumn = ref(store.columnMapping?.nameColumn ?? store.excelColumns[0] ?? '')
const divisionColumn = ref(store.columnMapping?.divisionColumn ?? store.excelColumns[1] ?? '')
const photoColumn = ref<string | null>(store.columnMapping?.photoColumn ?? null)
const answerTemplate = ref(store.columnMapping?.answerTemplate ?? `{{${nameColumn.value}}}`)
const availableColumnHint = computed(() =>
  store.excelColumns.map((c) => `{{${c}}}`).join(', '),
)

// On a page reload, App.vue restores the store asynchronously (fetching
// saved progress from the server) *after* this view has already mounted --
// with hash-based routing, a reload lands straight back on /mapping, so the
// refs above get initialized from an still-empty store.excelColumns before
// restoreState() runs. Re-sync once the columns actually show up, so the
// selects don't stay stuck empty; stop after the first population so it
// doesn't clobber the user's own choices afterward.
let columnsSynced = false
watch(
  () => store.excelColumns,
  (columns) => {
    if (columnsSynced || !columns.length) return
    columnsSynced = true
    nameColumn.value = store.columnMapping?.nameColumn ?? columns[0] ?? ''
    divisionColumn.value = store.columnMapping?.divisionColumn ?? columns[1] ?? ''
    photoColumn.value = store.columnMapping?.photoColumn ?? null
    answerTemplate.value = store.columnMapping?.answerTemplate ?? `{{${nameColumn.value}}}`
  },
  { immediate: true },
)

function buildMembers() {
  store.applyColumnMapping({
    nameColumn: nameColumn.value,
    divisionColumn: divisionColumn.value,
    photoColumn: photoColumn.value ?? undefined,
    answerTemplate: answerTemplate.value,
  })
}

function onFixPhoto(rowId: string, files: File[] | File | null) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) {
    store.fixPhotoMatch(rowId, null)
    return
  }
  const reader = new FileReader()
  reader.onload = () => store.fixPhotoMatch(rowId, reader.result as string)
  reader.readAsDataURL(file)
}
</script>
