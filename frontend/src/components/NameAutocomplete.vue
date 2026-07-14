<template>
  <v-autocomplete
    v-if="box"
    ref="autocompleteRef"
    :key="box.id"
    :model-value="box.memberId"
    :items="items"
    item-title="name"
    item-value="id"
    label="Assign name"
    clearable
    density="compact"
    @update:model-value="onSelect"
  />
  <p v-else class="text-body-2">Select a box to assign a name.</p>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useAnnotationStore } from '../stores/annotationStore'

const store = useAnnotationStore()
const box = computed(() => store.selectedBox)
const autocompleteRef = ref<{ focus: () => void } | null>(null)

// Selecting a box (by click, or Tab/Shift+Tab in AnnotateView) jumps
// straight into typing a name, without an extra click into the field --
// worth it since this repeats 80+ times. The field is keyed on box.id (see
// template) so it fully remounts per box: its displayed text always derives
// fresh from the new box's memberId, with no stale typed-but-unconfirmed
// text leaking over from the previously selected box.
watch(
  () => box.value?.id,
  (newId) => {
    if (newId) nextTick(() => autocompleteRef.value?.focus())
  },
)

// Members already assigned to a different box are excluded, so the same
// name can never be picked twice; the currently assigned member (if any)
// stays visible so the field can still show/clear the existing pick.
const items = computed(() => {
  const list = [...store.unassignedMembers]
  const current = store.members.find((m) => m.id === box.value?.memberId)
  if (current) list.unshift(current)
  return list
})

function onSelect(memberId: string | null) {
  if (!box.value) return
  store.assignName(box.value.id, memberId)
}
</script>
