<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { refDebounced } from '@vueuse/core';

const route = useRoute();
const router = useRouter();
const eventsApi = useEvents();

const q = ref<string>((route.query.q as string) || '');
const debouncedQ = refDebounced(q, 300);

watch(debouncedQ, (val) => {
  router.replace({ query: val ? { q: val } : {} });
});

const { data: results, pending } = await useAsyncData(
  'search-events',
  () => debouncedQ.value.trim().length >= 2
    ? eventsApi.search(debouncedQ.value.trim())
    : Promise.resolve([]),
  { watch: [debouncedQ], default: () => [] },
);
</script>

<template>
  <section class="space-y-4">
    <UInput
      v-model="q"
      icon="i-heroicons-magnifying-glass"
      size="lg"
      placeholder="Поиск мероприятия"
      autofocus
      :ui="{ base: 'bg-slate-900 border border-slate-800' }"
    />

    <div v-if="pending" class="space-y-2">
      <EventCardSkeleton v-for="i in 3" :key="i" />
    </div>
    <AppEmpty
      v-else-if="!q || q.trim().length < 2"
      icon="i-heroicons-magnifying-glass"
      title="Введите запрос"
      description="Минимум 2 символа."
    />
    <AppEmpty
      v-else-if="!results?.length"
      icon="i-heroicons-magnifying-glass"
      title="Ничего не найдено"
      :description="`По запросу «${q}» нет мероприятий.`"
    />
    <div v-else class="space-y-2">
      <EventCardCompact v-for="e in results" :key="e.id" :event="e" />
    </div>
  </section>
</template>
