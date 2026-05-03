<script setup lang="ts">
import type { Event } from '~/types/api';

defineProps<{
  event: Event;
  availability?: { capacity: number; remaining: number } | null;
}>();
const route = useRoute();
const fullUrl = computed(() => {
  const config = useRuntimeConfig();
  return `${config.public.siteUrl || ''}${route.fullPath}`;
});
</script>

<template>
  <div class="relative aspect-[16/9] bg-slate-900 rounded-b-3xl overflow-hidden">
    <img
      v-if="event.coverImage?.url"
      :src="event.coverImage.url"
      :alt="event.title"
      class="absolute inset-0 w-full h-full object-cover"
    />
    <div class="absolute top-3 left-3"><AppBackButton /></div>
    <div class="absolute top-3 right-3 flex items-center gap-2">
      <FavoriteToggle :event-id="event.id" />
      <AppShareButton :title="event.title" :url="fullUrl" />
    </div>
    <div class="absolute bottom-4 left-4 flex flex-wrap gap-2">
      <CategoryBadge v-if="event.category" :category="event.category" />
      <AvailabilityBadge
        v-if="availability"
        :capacity="availability.capacity"
        :remaining="availability.remaining"
      />
    </div>
  </div>
</template>
