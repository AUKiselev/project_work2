<script setup lang="ts">
import { sanitizeHtml } from '~/utils/sanitize';

const props = defineProps<{ html?: string }>();
const safe = computed(() => sanitizeHtml(props.html ?? ''));
</script>

<template>
  <div class="prose prose-invert max-w-none" v-html="safe" />
</template>
