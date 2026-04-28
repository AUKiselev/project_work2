<script setup lang="ts">
interface Item { label: string; to: string; icon: string }
defineProps<{ items: Item[] }>();
</script>

<template>
  <ul class="rounded-xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
    <li v-for="i in items" :key="i.to">
      <NuxtLink
        :to="i.to"
        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-900/50"
      >
        <UIcon :name="i.icon" class="w-5 h-5 text-slate-400" />
        <span class="flex-1">{{ i.label }}</span>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-500" />
      </NuxtLink>
    </li>
  </ul>
</template>
