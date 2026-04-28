<script setup lang="ts">
import type { TicketTier } from '~/types/api';
import { formatPrice } from '~/utils/format';

const props = defineProps<{ tiers?: TicketTier[]; mode?: 'from' | 'range' }>();
const range = computed(() => {
  if (!props.tiers || !props.tiers.length) return null;
  const prices = props.tiers.map((t) => t.price).sort((a, b) => a - b);
  return { min: prices[0]!, max: prices[prices.length - 1]! };
});
</script>

<template>
  <span v-if="range" class="text-sm font-medium">
    <template v-if="mode === 'range' && range.min !== range.max">
      {{ formatPrice(range.min, 'RUB') }} — {{ formatPrice(range.max, 'RUB') }}
    </template>
    <template v-else>
      от {{ formatPrice(range.min, 'RUB') }}
    </template>
  </span>
</template>
