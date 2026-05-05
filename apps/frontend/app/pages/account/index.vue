<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();

const items = [
  { label: 'Избранное', to: '/account/favorites', icon: 'i-heroicons-heart' },
  { label: 'Связаться с менеджером', to: '/account/contact-manager', icon: 'i-heroicons-chat-bubble-left-right' },
  { label: 'Стать спикером', to: '/account/become-speaker', icon: 'i-heroicons-megaphone' },
  { label: 'Активные сессии', to: '/account/sessions', icon: 'i-heroicons-device-phone-mobile' },
];

const onLogout = async () => {
  await auth.logout();
  await navigateTo('/login');
};
</script>

<template>
  <section class="space-y-6">
    <ProfileCard v-if="auth.user" :user="auth.user" />
    <AccountMenu :items="items" />
    <UButton block color="red" variant="soft" icon="i-heroicons-arrow-right-on-rectangle" @click="onLogout">
      Выйти из аккаунта
    </UButton>
  </section>
</template>
