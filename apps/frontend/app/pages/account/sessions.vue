<script setup lang="ts">
import { useSessions, type DeviceSession } from '~/composables/useSessions';

definePageMeta({ middleware: 'auth', layout: 'back' });

const { list, revoke, revokeOthers } = useSessions();
const sessions = ref<DeviceSession[]>([]);
const pending = ref(false);
const errorMsg = ref<string | null>(null);

const refresh = async () => {
  pending.value = true;
  errorMsg.value = null;
  try { sessions.value = await list(); }
  catch (err: any) { errorMsg.value = err?.data?.error?.message || 'Не удалось загрузить сессии'; }
  finally { pending.value = false; }
};

const onRevoke = async (id: string) => { await revoke(id); await refresh(); };
const onRevokeOthers = async () => { await revokeOthers(); await refresh(); };

onMounted(refresh);
</script>

<template>
  <section class="px-4 py-4 space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Активные сессии</h1>
      <UButton
        v-if="sessions.length > 1"
        size="xs" color="gray" variant="soft"
        @click="onRevokeOthers"
      >Завершить остальные</UButton>
    </header>
    <p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>
    <p v-if="pending" class="text-sm text-slate-400">Загрузка…</p>
    <ul class="space-y-2">
      <li
        v-for="s in sessions"
        :key="s.documentId"
        class="rounded border border-slate-800 px-4 py-3 flex items-center justify-between"
        :class="{ 'border-indigo-500': s.current }"
      >
        <div>
          <div class="font-medium">
            {{ s.name || 'Неизвестное устройство' }}
            <span v-if="s.current" class="text-xs text-indigo-400 ml-2">(это устройство)</span>
          </div>
          <div class="text-xs text-slate-400">
            {{ s.platform }} · {{ s.ipAddress || '—' }} · был активен {{ new Date(s.lastActiveAt).toLocaleString('ru-RU') }}
          </div>
        </div>
        <UButton
          v-if="!s.current"
          size="xs" color="red" variant="soft"
          @click="onRevoke(s.documentId)"
        >Завершить</UButton>
      </li>
    </ul>
  </section>
</template>
