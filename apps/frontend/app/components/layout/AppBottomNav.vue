<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const route = useRoute();

interface NavItem { to: string; label: string; icon: string; activeIcon?: string; auth?: boolean }
const items: NavItem[] = [
  { to: '/', label: 'Главная', icon: 'i-heroicons-home' },
  { to: '/search', label: 'Поиск', icon: 'i-heroicons-magnifying-glass' },
  { to: '/tickets', label: 'Билеты', icon: 'i-heroicons-ticket', auth: true },
  { to: '/account', label: 'Профиль', icon: 'i-heroicons-user-circle', auth: true },
];

const onTap = async (item: NavItem) => {
  if (item.auth && !auth.isAuthenticated) {
    await navigateTo({ path: '/login', query: { redirect: item.to } });
    return;
  }
  await navigateTo(item.to);
};

const isActive = (to: string) => to === '/' ? route.path === '/' : route.path.startsWith(to);
</script>

<template>
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
  >
    <ul class="grid grid-cols-4">
      <li v-for="item in items" :key="item.to">
        <button
          type="button"
          class="w-full flex flex-col items-center gap-1 py-2 text-xs"
          :class="isActive(item.to) ? 'text-indigo-400' : 'text-slate-400'"
          @click="onTap(item)"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
