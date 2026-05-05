<script setup lang="ts">
import type { Venue } from '~/types/api';

const props = defineProps<{ venue?: Venue | null }>();

const yandexUrl = computed(() => {
  if (!props.venue?.address) return null;
  return `https://yandex.ru/maps/?text=${encodeURIComponent(props.venue.address)}`;
});
</script>

<template>
  <div v-if="venue" class="rounded-2xl overflow-hidden border border-slate-800">
    <iframe
      v-if="venue.mapEmbed"
      :src="venue.mapEmbed"
      class="w-full h-64"
      sandbox="allow-scripts allow-same-origin allow-popups"
      referrerpolicy="no-referrer"
      loading="lazy"
      title="Карта"
    />
    <div v-else class="p-4 flex flex-col gap-2">
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-slate-400 mt-0.5" />
        <div>
          <p class="font-medium">{{ venue.name }}</p>
          <p v-if="venue.address" class="text-sm text-slate-400">{{ venue.address }}</p>
        </div>
      </div>
      <UButton
        v-if="yandexUrl"
        :to="yandexUrl"
        target="_blank"
        rel="noopener noreferrer"
        color="gray"
        variant="soft"
        icon="i-heroicons-arrow-top-right-on-square"
      >
        Открыть в Яндекс.Картах
      </UButton>
    </div>
  </div>
</template>
