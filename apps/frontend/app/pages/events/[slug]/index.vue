<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { formatDateRange } from '~/utils/format';

definePageMeta({ layout: 'back' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const eventsApi = useEvents();

const { data: event, error } = await useAsyncData(
  () => `event-${slug.value}`,
  () => eventsApi.findBySlug(slug.value),
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Мероприятие не найдено', fatal: true });
}

const dateText = computed(() => event.value
  ? formatDateRange(event.value.startsAt, event.value.endsAt, event.value.timezone)
  : '',
);

const onBuy = async () => {
  await navigateTo(`/events/${slug.value}/checkout`);
};
</script>

<template>
  <div v-if="event" class="pb-24">
    <EventHero :event="event" />

    <div class="px-4 mt-4 space-y-6">
      <h1 class="text-2xl font-bold">{{ event.title }}</h1>

      <EventOrganizerBlock v-if="event.organizer" :organizer="event.organizer" />

      <div class="space-y-1">
        <p class="text-sm text-slate-400">Когда</p>
        <p class="font-medium">{{ dateText }}</p>
      </div>

      <div v-if="event.venue" class="space-y-1">
        <p class="text-sm text-slate-400">Где</p>
        <p class="font-medium">{{ event.venue.name }}</p>
        <p v-if="event.venue.address" class="text-sm text-slate-400">{{ event.venue.address }}</p>
      </div>

      <section v-if="event.description" class="space-y-2">
        <h2 class="text-lg font-semibold">О мероприятии</h2>
        <AppMarkdown :html="event.description" />
      </section>

      <section v-if="event.agenda?.length" class="space-y-2">
        <h2 class="text-lg font-semibold">Программа</h2>
        <EventAgenda :items="event.agenda" :tz="event.timezone" />
      </section>

      <section v-if="event.venue" class="space-y-2">
        <h2 class="text-lg font-semibold">Место проведения</h2>
        <EventMap :venue="event.venue" />
      </section>

      <section v-if="event.speakers?.length" class="space-y-2">
        <h2 class="text-lg font-semibold">Спикеры</h2>
        <EventSpeakers :speakers="event.speakers" />
      </section>

      <section v-if="event.pastGallery?.length" class="space-y-2">
        <h2 class="text-lg font-semibold">С прошлого мероприятия</h2>
        <EventGallery :images="event.pastGallery" />
      </section>
    </div>

    <div
      class="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden flex items-center justify-between gap-3"
      :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }"
    >
      <EventPriceRange :tiers="event.tiers" mode="range" />
      <UButton size="lg" color="primary" :disabled="!event.tiers?.length" @click="onBuy">
        Купить
      </UButton>
    </div>

    <div class="hidden lg:flex items-center justify-between mt-6 px-4">
      <EventPriceRange :tiers="event.tiers" mode="range" />
      <UButton size="lg" color="primary" :disabled="!event.tiers?.length" @click="onBuy">
        Купить
      </UButton>
    </div>
  </div>
</template>
