<script setup lang="ts">
import type { Speaker } from '~/types/api';

defineProps<{ speaker: Speaker }>();
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-900 shrink-0">
      <img
        v-if="speaker.photo?.url"
        :src="speaker.photo.url"
        :alt="speaker.fullName"
        class="w-full h-full object-cover"
      />
    </div>
    <span class="text-sm">{{ speaker.fullName }}</span>
  </div>
</template>
