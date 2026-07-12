<template>
  <div>
    <p class="text-caption mb-1">Unassigned members ({{ store.unassignedMembers.length }})</p>
    <p v-if="!store.unassignedMembers.length" class="text-body-2">All members assigned.</p>
    <v-chip
      v-for="member in store.unassignedMembers"
      :key="member.id"
      class="ma-1"
      :disabled="!store.selectedBoxId"
      @click="assign(member.id)"
    >
      {{ member.name }}
    </v-chip>
  </div>
</template>

<script setup lang="ts">
import { useAnnotationStore } from '../stores/annotationStore'

const store = useAnnotationStore()

function assign(memberId: string) {
  if (!store.selectedBoxId) return
  store.assignName(store.selectedBoxId, memberId)
}
</script>
