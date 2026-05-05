<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500" />
    <h2 class="text-lg font-medium">{{ title }}</h2>
    <p v-if="description" class="text-sm text-slate-400 max-w-sm">{{ description }}</p>
    <UButton color="gray" variant="soft" @click="emit('retry')">Повторить</UButton>
  </div>
</template>
