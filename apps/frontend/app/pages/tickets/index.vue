<script setup lang="ts">
import { useTickets } from '~/composables/useTickets';

definePageMeta({ middleware: 'auth' });

const ticketsApi = useTickets();
// server: false — auth-стор гидратируется только на клиенте, на SSR
// токена нет и /me/tickets вернёт 401. Грузим после mount.
const { data: tickets, pending } = await useAsyncData('my-tickets', () => ticketsApi.listMine(), { default: () => [], server: false });

const now = Date.now();
const upcoming = computed(() => (tickets.value ?? []).filter((t) =>
  t.event?.startsAt && new Date(t.event.startsAt).getTime() >= now,
));
const past = computed(() => (tickets.value ?? []).filter((t) =>
  t.event?.startsAt && new Date(t.event.startsAt).getTime() < now,
));
</script>

<template>
  <section class="space-y-4">
    <h1 class="text-xl font-semibold">Мои билеты</h1>
    <div v-if="pending" class="space-y-2">
      <EventCardSkeleton v-for="i in 2" :key="i" />
    </div>
    <AppEmpty
      v-else-if="!tickets?.length"
      icon="i-heroicons-ticket"
      title="Билетов пока нет"
      description="Купите билет — и он появится здесь."
      cta-label="К мероприятиям"
      cta-to="/"
    />
    <template v-else>
      <div v-if="upcoming.length" class="space-y-2">
        <h2 class="text-sm uppercase tracking-wide text-slate-500">Предстоящие</h2>
        <EventCardMyTicket
          v-for="t in upcoming"
          :key="t.id"
          :event="t.event!"
          :ticket-id="t.id"
        />
      </div>
      <div v-if="past.length" class="space-y-2">
        <h2 class="text-sm uppercase tracking-wide text-slate-500">Прошедшие</h2>
        <EventCardMyTicket
          v-for="t in past"
          :key="t.id"
          :event="t.event!"
          :ticket-id="t.id"
        />
      </div>
    </template>
  </section>
</template>
