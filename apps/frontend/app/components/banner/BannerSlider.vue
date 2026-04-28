<script setup lang="ts">
import type { Banner } from '~/types/api';

defineProps<{ banners: Banner[] }>();
</script>

<template>
  <div v-if="banners.length" class="overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2">
    <div class="flex gap-3" style="scroll-snap-type: x mandatory;">
      <div v-for="b in banners" :key="b.id" class="w-[88%] sm:w-[70%] shrink-0">
        <BannerSlide :banner="b" />
      </div>
    </div>
  </div>
</template>
