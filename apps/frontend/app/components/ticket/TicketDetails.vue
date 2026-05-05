<script setup lang="ts">
import type { Ticket } from '~/types/api';
import { formatDateRange, formatPrice } from '~/utils/format';

const props = defineProps<{ ticket: Ticket }>();
const dateText = computed(() => props.ticket.event
  ? formatDateRange(props.ticket.event.startsAt, props.ticket.event.endsAt, props.ticket.event.timezone)
  : '',
);
</script>

<template>
  <div class="space-y-3">
    <h1 class="text-xl font-semibold">{{ ticket.event?.title }}</h1>
    <p class="text-sm text-slate-400">{{ dateText }}</p>
    <p v-if="ticket.event?.venue?.name" class="text-sm text-slate-400">
      {{ ticket.event.venue.name }}<span v-if="ticket.event.venue.address">, {{ ticket.event.venue.address }}</span>
    </p>
    <div class="flex items-center justify-between border-t border-slate-800 pt-3">
      <span class="font-medium">{{ ticket.tier?.name }}</span>
      <span v-if="ticket.tier?.price != null" class="tabular-nums">
        {{ formatPrice(ticket.tier.price, ticket.tier.currency || 'RUB') }}
      </span>
    </div>
    <div class="text-xs text-slate-400 space-y-0.5">
      <p>Заказ № {{ ticket.order?.number }}</p>
      <p>Билет № {{ ticket.number }}</p>
      <p>Посетитель: {{ ticket.attendee?.fullName }}</p>
    </div>
  </div>
</template>
