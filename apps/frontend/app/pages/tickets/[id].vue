<script setup lang="ts">
import { useTickets } from '~/composables/useTickets';
import { useShare } from '~/composables/useShare';

definePageMeta({ middleware: 'auth', layout: 'back' });

const route = useRoute();
const id = Number(route.params.id);
const ticketsApi = useTickets();
const { share } = useShare();

// server: false — auth-only, на SSR токена нет.
const { data: ticket, error } = await useAsyncData(
  () => `ticket-${id}`,
  () => ticketsApi.findOneMine(id),
  { server: false },
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Билет не найден', fatal: true });
}

const qrRef = ref<{ toDataUrl: () => string | undefined } | null>(null);

const onDownload = () => {
  const url = qrRef.value?.toDataUrl?.();
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${ticket.value?.number ?? id}.png`;
  a.click();
};

const onShare = () => {
  const fullUrl = (typeof window !== 'undefined') ? window.location.href : '';
  share({ title: ticket.value?.event?.title, url: fullUrl });
};
</script>

<template>
  <div v-if="ticket" class="px-4 py-4 space-y-6 pb-20">
    <div class="flex items-center justify-end gap-2">
      <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-down-tray" aria-label="Скачать" @click="onDownload" />
      <UButton color="gray" variant="ghost" icon="i-heroicons-share" aria-label="Поделиться" @click="onShare" />
    </div>

    <TicketQr v-if="ticket.qrPayload" ref="qrRef" :payload="ticket.qrPayload" />

    <TicketDetails :ticket="ticket" />

    <EventMap v-if="ticket.event?.venue" :venue="ticket.event.venue" />

    <EventOrganizerBlock v-if="ticket.event?.organizer" :organizer="ticket.event.organizer" />

    <section v-if="ticket.tier?.description" class="space-y-2">
      <h2 class="text-lg font-semibold">Правила использования</h2>
      <AppMarkdown :html="ticket.tier.description" />
    </section>
  </div>
</template>
