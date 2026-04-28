<script setup lang="ts">
import type { Order } from '~/types/api';
import { formatPrice } from '~/utils/format';

defineProps<{ order: Order }>();
</script>

<template>
  <div class="rounded-xl border border-slate-800 p-4 space-y-2">
    <p class="text-sm text-slate-400">Заказ № {{ order.number }}</p>
    <ul v-if="order.items?.length" class="space-y-1 text-sm">
      <li v-for="i in order.items" :key="i.id" class="flex justify-between">
        <span>{{ i.tier?.name }} × {{ i.quantity }}</span>
        <span class="tabular-nums">{{ formatPrice(i.unitPrice * i.quantity, 'RUB') }}</span>
      </li>
    </ul>
    <div class="flex justify-between text-sm text-slate-400 border-t border-slate-800 pt-2">
      <span>Подытог</span>
      <span class="tabular-nums">{{ formatPrice(order.subtotal, 'RUB') }}</span>
    </div>
    <div v-if="order.discount > 0" class="flex justify-between text-sm text-emerald-400">
      <span>Скидка</span>
      <span class="tabular-nums">−{{ formatPrice(order.discount, 'RUB') }}</span>
    </div>
    <div class="flex justify-between font-semibold">
      <span>Итого</span>
      <span class="tabular-nums">{{ formatPrice(order.total, 'RUB') }}</span>
    </div>
  </div>
</template>
