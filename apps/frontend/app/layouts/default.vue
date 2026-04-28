<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();

const onLogout = async () => {
  await auth.logout();
  await navigateTo('/login');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <NuxtLink to="/" class="font-semibold tracking-tight">ProjectWork2</NuxtLink>
      <nav class="flex items-center gap-4 text-sm">
        <template v-if="auth.isAuthenticated">
          <NuxtLink to="/sessions" class="hover:underline">Sessions</NuxtLink>
          <span class="text-slate-400">{{ auth.user?.username }}</span>
          <button
            type="button"
            class="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
            @click="onLogout"
          >
            Logout
          </button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="hover:underline">Login</NuxtLink>
          <NuxtLink to="/register" class="hover:underline">Register</NuxtLink>
        </template>
      </nav>
    </header>
    <main class="flex-1 px-6 py-8 max-w-4xl w-full mx-auto">
      <slot />
    </main>
  </div>
</template>
