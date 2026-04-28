<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();

const onLogout = async () => {
  await auth.logout();
  await navigateTo('/login');
};
</script>

<template>
  <header class="hidden lg:flex items-center justify-between px-6 py-4 border-b border-slate-800">
    <NuxtLink to="/" class="text-lg font-semibold tracking-tight">ProjectWork2</NuxtLink>
    <nav class="flex items-center gap-6 text-sm">
      <NuxtLink to="/" class="hover:text-white">Главная</NuxtLink>
      <NuxtLink to="/search" class="hover:text-white">Поиск</NuxtLink>
      <template v-if="auth.isAuthenticated">
        <NuxtLink to="/tickets" class="hover:text-white">Билеты</NuxtLink>
        <NuxtLink to="/account" class="hover:text-white">{{ auth.user?.username }}</NuxtLink>
        <UButton size="xs" color="gray" variant="soft" @click="onLogout">Выйти</UButton>
      </template>
      <template v-else>
        <NuxtLink to="/login" class="hover:text-white">Войти</NuxtLink>
        <NuxtLink to="/register" class="hover:text-white">Регистрация</NuxtLink>
      </template>
    </nav>
  </header>
</template>
