<script setup lang="ts">
import { formatDate } from '~/utils/format';

const props = defineProps<{ startsAt: string; tz?: string; compact?: boolean }>();
const text = computed(() => formatDate(props.startsAt, props.tz ?? 'Europe/Moscow'));
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
    :class="compact ? 'bg-slate-900/60' : 'bg-slate-800/80'"
  >
    <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
    {{ text }}
  </span>
</template>
