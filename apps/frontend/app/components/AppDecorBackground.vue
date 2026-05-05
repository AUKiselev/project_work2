<script setup lang="ts">
type Variant = 'auth' | 'page' | 'subtle';
const props = defineProps<{ variant?: Variant }>();
const variant = computed<Variant>(() => props.variant ?? 'subtle');
</script>

<template>
  <div class="relative isolate">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <template v-if="variant === 'auth'">
        <div class="absolute -top-32 -right-24 size-96 rounded-full bg-primary-500/20 blur-3xl" />
        <div class="absolute -bottom-32 -left-24 size-96 rounded-full bg-violet-500/20 blur-3xl" />
      </template>
      <template v-else-if="variant === 'page'">
        <div class="absolute top-0 right-1/4 size-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div class="absolute bottom-0 left-1/4 size-72 rounded-full bg-sky-500/10 blur-3xl" />
      </template>
      <template v-else>
        <div class="absolute top-10 right-10 size-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute bottom-10 left-10 size-64 rounded-full bg-violet-500/10 blur-3xl" />
      </template>
    </div>
    <slot />
  </div>
</template>
