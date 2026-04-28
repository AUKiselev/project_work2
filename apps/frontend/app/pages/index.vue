<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <section class="space-y-4">
    <h1 class="text-3xl font-bold">ProjectWork2</h1>
    <p v-if="auth.isAuthenticated">
      Welcome back, <span class="font-semibold">{{ auth.user?.username }}</span>.
    </p>
    <p v-else class="text-slate-400">
      Public landing. <NuxtLink to="/login" class="underline">Log in</NuxtLink> or
      <NuxtLink to="/register" class="underline">create an account</NuxtLink>.
    </p>
  </section>
</template>
