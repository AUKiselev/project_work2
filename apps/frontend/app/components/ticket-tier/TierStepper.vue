<script setup lang="ts">
const props = defineProps<{ modelValue: number; max?: number }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const dec = () => emit('update:modelValue', Math.max(0, props.modelValue - 1));
const inc = () => emit('update:modelValue', props.max != null ? Math.min(props.max, props.modelValue + 1) : props.modelValue + 1);
</script>

<template>
  <div class="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-800">
    <button
      type="button"
      class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 disabled:opacity-30"
      :disabled="modelValue <= 0"
      @click="dec"
    >−</button>
    <span class="w-6 text-center text-sm tabular-nums">{{ modelValue }}</span>
    <button
      type="button"
      class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 disabled:opacity-30"
      :disabled="max != null && modelValue >= max"
      @click="inc"
    >+</button>
  </div>
</template>
