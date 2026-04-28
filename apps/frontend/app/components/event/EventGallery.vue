<script setup lang="ts">
import type { MediaFile } from '~/types/api';

defineProps<{ images: MediaFile[] }>();
</script>

<template>
  <div v-if="images.length" class="overflow-x-auto -mx-4 px-4">
    <div class="flex gap-2">
      <a
        v-for="img in images"
        :key="img.id"
        :href="img.url"
        target="_blank"
        rel="noopener noreferrer"
        class="w-40 h-28 rounded-lg overflow-hidden bg-slate-900 shrink-0"
      >
        <img :src="img.url" alt="" class="w-full h-full object-cover" loading="lazy" />
      </a>
    </div>
  </div>
</template>
