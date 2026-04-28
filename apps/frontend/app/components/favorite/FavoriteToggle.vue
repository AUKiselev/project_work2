<script setup lang="ts">
import { useFavorites } from '~/composables/useFavorites';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{ eventId: number; size?: 'sm' | 'md' }>();
const auth = useAuthStore();
const favs = useFavorites();
const route = useRoute();

const active = computed(() => favs.isFavorite(props.eventId));
const pending = ref(false);

const toggle = async () => {
  if (!auth.isAuthenticated) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  if (pending.value) return;
  pending.value = true;
  try {
    if (active.value) await favs.remove(props.eventId);
    else await favs.add(props.eventId);
  } finally {
    pending.value = false;
  }
};

onMounted(() => { if (auth.isAuthenticated) favs.ensureLoaded().catch(() => {}); });
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    aria-label="Мне интересно"
    :class="[
      'inline-flex items-center justify-center rounded-full transition',
      size === 'sm' ? 'w-8 h-8' : 'w-10 h-10',
      active ? 'bg-red-500/20 text-red-400' : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800',
    ]"
    @click.stop.prevent="toggle"
  >
    <UIcon
      :name="active ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
      class="w-5 h-5"
    />
  </button>
</template>
