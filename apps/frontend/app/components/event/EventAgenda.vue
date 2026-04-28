<script setup lang="ts">
import type { AgendaItem } from '~/types/api';
import { formatDate } from '~/utils/format';

defineProps<{ items: AgendaItem[]; tz?: string }>();
</script>

<template>
  <ol v-if="items.length" class="space-y-3">
    <li v-for="item in items" :key="item.id" class="flex gap-3">
      <div class="w-20 shrink-0 text-sm text-slate-400 font-mono">
        {{ formatDate(item.startsAt, tz ?? 'Europe/Moscow').split(', ')[1] }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium">{{ item.title }}</p>
        <p v-if="item.description" class="text-sm text-slate-400">{{ item.description }}</p>
        <p v-if="item.speakers?.length" class="text-xs text-slate-500 mt-1">
          {{ item.speakers.map((s) => s.fullName).join(', ') }}
        </p>
      </div>
    </li>
  </ol>
</template>
