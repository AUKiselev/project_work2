<script setup lang="ts">
import type { Event } from '~/types/api';

defineProps<{
  event: Event;
  availability?: { capacity: number; remaining: number } | null;
}>();
</script>

<template>
  <NuxtLink
    :to="`/events/${event.slug}`"
    class="block rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/40 hover:border-slate-700 transition"
  >
    <div class="relative aspect-[16/9] bg-slate-900">
      <img
        v-if="event.coverImage?.url"
        :src="event.coverImage.url"
        :alt="event.title"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div class="absolute top-2 right-2">
        <FavoriteToggle :event-id="event.id" size="sm" />
      </div>
      <div class="absolute bottom-2 left-2">
        <EventDateBadge :starts-at="event.startsAt" :tz="event.timezone" />
      </div>
    </div>
    <div class="p-4 space-y-1">
      <div v-if="event.category || availability" class="mb-2 flex flex-wrap items-center gap-2">
        <CategoryBadge v-if="event.category" :category="event.category" />
        <AvailabilityBadge
          v-if="availability"
          :capacity="availability.capacity"
          :remaining="availability.remaining"
        />
      </div>
      <h3 class="text-base font-semibold line-clamp-2">{{ event.title }}</h3>
      <div v-if="event.venue?.name" class="mt-1 flex items-center gap-1 text-xs text-slate-400">
        <UIcon name="i-heroicons-map-pin" class="size-3" />
        <span class="truncate">{{ event.venue.name }}</span>
      </div>
      <p v-if="event.shortDescription" class="text-sm text-slate-400 line-clamp-2">
        {{ event.shortDescription }}
      </p>
      <div class="pt-1">
        <EventPriceRange :tiers="event.tiers" mode="from" />
      </div>
    </div>
  </NuxtLink>
</template>
