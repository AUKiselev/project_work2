<script setup lang="ts">
// Главный layout: top-nav (lg+), bottom-nav (mobile), main slot.
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <AppTopNav />
    <main class="flex-1 px-4 py-4 lg:px-6 lg:py-8 max-w-3xl w-full mx-auto pb-20 lg:pb-8">
      <slot />
    </main>
    <AppFooter />
    <AppBottomNav />
  </div>
</template>
