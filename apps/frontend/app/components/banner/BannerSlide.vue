<script setup lang="ts">
import type { Banner } from '~/types/api';

const props = defineProps<{ banner: Banner }>();
</script>

<template>
  <component
    :is="banner.url ? 'a' : 'div'"
    :href="banner.url || undefined"
    :target="banner.url ? '_blank' : undefined"
    rel="noopener noreferrer"
    class="snap-start shrink-0 w-full rounded-2xl overflow-hidden bg-slate-900 relative"
    style="scroll-snap-align: start;"
  >
    <div class="aspect-[16/7]">
      <img
        v-if="banner.image?.url"
        :src="banner.image.url"
        :alt="banner.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <h3 class="text-white font-semibold">{{ banner.title }}</h3>
    </div>
  </component>
</template>
