<script setup lang="ts">
const props = defineProps<{
  user: { username: string; email: string; fullName?: string; avatar?: { url?: string } };
}>();

const initials = computed(() => {
  const src = props.user.fullName || props.user.username || '';
  return src.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
});
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="w-16 h-16 rounded-full overflow-hidden bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xl font-semibold shrink-0">
      <img v-if="user.avatar?.url" :src="user.avatar.url" alt="" class="w-full h-full object-cover" />
      <span v-else>{{ initials }}</span>
    </div>
    <div class="min-w-0">
      <p class="font-semibold">{{ user.fullName || user.username }}</p>
      <p class="text-sm text-slate-400 truncate">{{ user.email }}</p>
    </div>
  </div>
</template>
