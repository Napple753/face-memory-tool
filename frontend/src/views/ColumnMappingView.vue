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
      <v-select
        v-model="answerColumns"
        :items="store.excelColumns"
        label="Answer text columns"
        multiple
        chips
        class="mb-2"
      />
      <v-checkbox v-model="useLineBreak" label="Join answer columns with a line break" class="mb-0" />
      <v-text-field
        v-if="!useLineBreak"
        v-model="separator"
        label="Answer column separator"
        class="mb-2"
      />

      <v-btn color="primary" :disabled="!nameColumn || !divisionColumn" @click="buildMembers">
        Build member list
      </v-btn>

      <template v-if="store.members.length">
        <v-alert v-if="store.duplicateNames.length" type="warning" density="compact" class="mb-4">
          Duplicate name{{ store.duplicateNames.length > 1 ? 's' : '' }} found:
          {{ store.duplicateNames.join(', ') }}. They'll appear more than once, identically,
          in the name-assignment list during annotation, so it's easy to pick the wrong one --
          consider making these names unique in the spreadsheet (e.g. add a last initial) and
          re-uploading.
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from '../stores/annotationStore'

const router = useRouter()
const store = useAnnotationStore()

const nameColumn = ref(store.columnMapping?.nameColumn ?? store.excelColumns[0] ?? '')
const divisionColumn = ref(store.columnMapping?.divisionColumn ?? store.excelColumns[1] ?? '')
const photoColumn = ref<string | null>(store.columnMapping?.photoColumn ?? null)
const answerColumns = ref<string[]>(store.columnMapping?.answerColumns ?? [])
const separator = ref(store.columnMapping?.answerSeparator ?? ', ')
const useLineBreak = ref(store.columnMapping?.answerSeparator === '\n')

function buildMembers() {
  store.applyColumnMapping({
    nameColumn: nameColumn.value,
    divisionColumn: divisionColumn.value,
    photoColumn: photoColumn.value ?? undefined,
    answerColumns: answerColumns.value,
    answerSeparator: useLineBreak.value ? '\n' : separator.value,
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
