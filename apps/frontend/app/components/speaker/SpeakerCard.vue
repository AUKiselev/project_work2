<script setup lang="ts">
import type { Speaker } from '~/types/api';

defineProps<{ speaker: Speaker }>();
</script>

<template>
  <div class="space-y-2">
    <div class="aspect-square rounded-xl overflow-hidden bg-slate-900">
      <img
        v-if="speaker.photo?.url"
        :src="speaker.photo.url"
        :alt="speaker.fullName"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <p class="text-sm font-medium line-clamp-2">{{ speaker.fullName }}</p>
  </div>
</template>
