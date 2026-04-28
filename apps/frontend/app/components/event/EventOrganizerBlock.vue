<script setup lang="ts">
import type { Organizer } from '~/types/api';

defineProps<{ organizer: Organizer }>();
</script>

<template>
  <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60">
    <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-800 shrink-0">
      <img
        v-if="organizer.logo?.url"
        :src="organizer.logo.url"
        :alt="organizer.name"
        class="w-full h-full object-cover"
      />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-slate-400">Организатор</p>
      <p class="font-medium truncate">{{ organizer.name }}</p>
    </div>
  </div>
</template>
