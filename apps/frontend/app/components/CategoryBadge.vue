<script setup lang="ts">
import { computed } from 'vue';

type ColorToken = 'primary' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

const props = defineProps<{
  category: { title: string; colorToken?: ColorToken } | null | undefined;
}>();

const colorClasses: Record<ColorToken, string> = {
  primary: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const cls = computed(() => {
  const token = props.category?.colorToken ?? 'primary';
  return colorClasses[token];
});
</script>

<template>
  <span
    v-if="category"
    :class="['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cls]"
  >
    {{ category.title }}
  </span>
</template>
