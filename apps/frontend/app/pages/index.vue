<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { useBanners } from '~/composables/useBanners';

const eventsApi = useEvents();
const bannersApi = useBanners();

const { data: banners, pending: bannersPending } = await useAsyncData('home-banners', () => bannersApi.list(), { default: () => [] });
const { data: events, pending: eventsPending, error: eventsError, refresh } = await useAsyncData('home-events', () => eventsApi.list({ pageSize: 20 }), { default: () => [] });
</script>

<template>
  <section class="space-y-6">
    <BannerSlider v-if="!bannersPending && banners?.length" :banners="banners" />

    <h1 class="text-xl font-semibold px-1">Ближайшие мероприятия</h1>

    <div v-if="eventsPending" class="grid gap-4 sm:grid-cols-2">
      <EventCardSkeleton v-for="i in 4" :key="i" />
    </div>
    <AppErrorState
      v-else-if="eventsError"
      title="Не удалось загрузить мероприятия"
      :description="eventsError.message"
      @retry="refresh()"
    />
    <AppEmpty
      v-else-if="!events || events.length === 0"
      icon="i-heroicons-calendar"
      title="Пока нет ближайших мероприятий"
      description="Загляните позже — мы публикуем новые анонсы регулярно."
    />
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <EventCard v-for="e in events" :key="e.id" :event="e" />
    </div>
  </section>
</template>
