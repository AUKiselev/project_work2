<script setup lang="ts">
import type { TicketTier } from '~/types/api';
import { formatPrice } from '~/utils/format';

const props = defineProps<{ tier: TicketTier; qty: number }>();
const emit = defineEmits<{ 'update:qty': [value: number] }>();

const expanded = ref(false);
</script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900/40">
    <div class="flex items-center justify-between p-4 gap-3">
      <button
        type="button"
        class="flex-1 text-left flex items-center gap-2"
        @click="expanded = !expanded"
      >
        <UIcon
          :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-4 h-4 text-slate-400"
        />
        <div>
          <p class="font-medium">{{ tier.name }}</p>
          <p v-if="tier.description" class="text-xs text-slate-400 line-clamp-1">{{ tier.description }}</p>
        </div>
      </button>
      <span class="font-semibold tabular-nums">{{ formatPrice(tier.price, tier.currency) }}</span>
      <TierStepper :model-value="qty" @update:model-value="(v) => emit('update:qty', v)" />
    </div>
    <div v-if="expanded && tier.includes" class="px-4 pb-4">
      <AppMarkdown :html="tier.includes" />
    </div>
  </div>
</template>
