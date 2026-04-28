<script setup lang="ts">
import type { Speaker } from '~/types/api';

defineProps<{ speakers: Speaker[] }>();
</script>

<template>
  <div v-if="speakers.length" class="overflow-x-auto -mx-4 px-4">
    <div class="flex gap-3">
      <SpeakerCard v-for="s in speakers" :key="s.id" :speaker="s" class="w-32 shrink-0" />
    </div>
  </div>
</template>
