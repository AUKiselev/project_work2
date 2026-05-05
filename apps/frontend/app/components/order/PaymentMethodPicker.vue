<script setup lang="ts">
import type { PaymentMethod } from '~/types/api';

const props = defineProps<{ modelValue: PaymentMethod }>();
const emit = defineEmits<{ 'update:modelValue': [value: PaymentMethod] }>();

const options = [
  { value: 'card' as PaymentMethod, label: 'Картой' },
  { value: 'sbp' as PaymentMethod, label: 'СБП' },
  { value: 'invoice' as PaymentMethod, label: 'По счёту' },
];
</script>

<template>
  <fieldset class="space-y-2">
    <legend class="font-semibold mb-2">Способ оплаты</legend>
    <label
      v-for="o in options"
      :key="o.value"
      class="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700"
      :class="{ 'border-indigo-500 bg-indigo-500/5': modelValue === o.value }"
    >
      <input
        type="radio"
        :checked="modelValue === o.value"
        :value="o.value"
        @change="emit('update:modelValue', o.value)"
      />
      <span>{{ o.label }}</span>
    </label>
  </fieldset>
</template>
