<script setup lang="ts">
import type { Order, Ticket } from '~/types/api';

defineProps<{ tickets: Ticket[] }>();
const open = ref<number | null>(null);
</script>

<template>
  <div class="space-y-2">
    <h2 class="font-semibold">Посетители заказа</h2>
    <div v-for="t in tickets" :key="t.id" class="rounded-lg border border-slate-800">
      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2"
        @click="open = open === t.id ? null : t.id"
      >
        <span class="text-sm">{{ t.attendee?.fullName }}</span>
        <UIcon :name="open === t.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4" />
      </button>
      <div v-if="open === t.id && t.qrPayload" class="px-3 pb-3">
        <TicketQr :payload="t.qrPayload" :size="240" />
        <p class="text-xs text-slate-400 text-center mt-1">№ {{ t.number }}</p>
      </div>
    </div>
  </div>
</template>
