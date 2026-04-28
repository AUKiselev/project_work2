<script setup lang="ts">
import { useFavorites } from '~/composables/useFavorites';

definePageMeta({ middleware: 'auth', layout: 'back' });

const favsApi = useFavorites();
const { data: favs, pending, refresh } = await useAsyncData(
  'me-favorites',
  () => favsApi.listMine(),
  { default: () => [] },
);
</script>

<template>
  <section class="px-4 py-4 space-y-3">
    <h1 class="text-xl font-semibold">Избранное</h1>
    <div v-if="pending" class="space-y-2"><EventCardSkeleton v-for="i in 2" :key="i" /></div>
    <AppEmpty
      v-else-if="!favs.length"
      icon="i-heroicons-heart"
      title="Пусто"
      description="Отмечайте интересные мероприятия — они появятся здесь."
      cta-label="К мероприятиям"
      cta-to="/"
    />
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <EventCard v-for="f in favs" :key="f.id" :event="(f.event as any)" />
    </div>
  </section>
</template>
