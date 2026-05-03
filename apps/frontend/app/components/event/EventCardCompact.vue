<script setup lang="ts">
import type { Event } from '~/types/api';
import { formatDate } from '~/utils/format';

const props = defineProps<{ event: Event }>();
const dateText = computed(() => formatDate(props.event.startsAt, props.event.timezone));
</script>

<template>
  <NuxtLink
    :to="`/events/${event.slug}`"
    class="flex gap-3 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition"
  >
    <div class="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0">
      <img
        v-if="event.coverImage?.url"
        :src="event.coverImage.url"
        :alt="event.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div class="flex-1 min-w-0 space-y-1">
      <CategoryBadge v-if="event.category" :category="event.category" class="mb-1" />
      <h3 class="font-medium line-clamp-2">{{ event.title }}</h3>
      <p class="text-xs text-slate-400">{{ dateText }}</p>
      <p v-if="event.venue?.name" class="text-xs text-slate-500 truncate">
        {{ event.venue.name }}
      </p>
    </div>
  </NuxtLink>
</template>
