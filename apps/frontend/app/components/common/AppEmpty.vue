<script setup lang="ts">
defineProps<{
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon v-if="icon" :name="icon" class="w-12 h-12 text-slate-600" />
    <h2 class="text-lg font-medium">{{ title }}</h2>
    <p v-if="description" class="text-sm text-slate-400 max-w-sm">{{ description }}</p>
    <UButton v-if="ctaLabel && ctaTo" :to="ctaTo" color="primary" variant="soft">{{ ctaLabel }}</UButton>
  </div>
</template>
