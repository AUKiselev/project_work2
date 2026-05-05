<script setup lang="ts">
defineProps<{
  illustration?: string;
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
}>();
</script>

<template>
  <AppDecorBackground variant="subtle">
    <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <EmptyIllustration v-if="illustration" :name="illustration" />
      <UIcon v-else-if="icon" :name="icon" class="w-12 h-12 text-slate-600" />
      <h2 class="text-lg font-medium">{{ title }}</h2>
      <p v-if="description" class="text-sm text-slate-400 max-w-sm">{{ description }}</p>
      <UButton v-if="ctaLabel && ctaTo" :to="ctaTo" color="primary" variant="soft">{{ ctaLabel }}</UButton>
    </div>
  </AppDecorBackground>
</template>
