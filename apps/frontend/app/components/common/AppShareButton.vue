<script setup lang="ts">
import { useShare } from '~/composables/useShare';

const props = defineProps<{ title?: string; text?: string; url: string }>();
const { share } = useShare();
</script>

<template>
  <UButton
    color="gray"
    variant="ghost"
    icon="i-heroicons-share"
    aria-label="Поделиться"
    @click="share({ title: props.title, text: props.text, url: props.url })"
  />
</template>
