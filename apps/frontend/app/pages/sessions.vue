<script setup lang="ts">
import { useSessions, type DeviceSession } from '~/composables/useSessions';

definePageMeta({ middleware: 'auth' });

const { list, revoke, revokeOthers } = useSessions();
const sessions = ref<DeviceSession[]>([]);
const pending = ref(false);
const errorMsg = ref<string | null>(null);

const refresh = async () => {
  pending.value = true;
  errorMsg.value = null;
  try {
    sessions.value = await list();
  } catch (err: any) {
    errorMsg.value = err?.data?.error?.message || 'Failed to load sessions';
  } finally {
    pending.value = false;
  }
};

const onRevoke = async (id: string) => {
  await revoke(id);
  await refresh();
};

const onRevokeOthers = async () => {
  await revokeOthers();
  await refresh();
};

onMounted(refresh);
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Active sessions</h1>
      <button
        v-if="sessions.length > 1"
        type="button"
        class="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm"
        @click="onRevokeOthers"
      >
        Revoke all others
      </button>
    </header>
    <p v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</p>
    <p v-if="pending" class="text-slate-400 text-sm">Loading…</p>
    <ul class="space-y-2">
      <li
        v-for="s in sessions"
        :key="s.documentId"
        class="rounded border border-slate-800 px-4 py-3 flex items-center justify-between"
        :class="{ 'border-indigo-500': s.current }"
      >
        <div>
          <div class="font-medium">
            {{ s.name || 'Unknown device' }}
            <span v-if="s.current" class="text-xs text-indigo-400 ml-2">(this device)</span>
          </div>
          <div class="text-xs text-slate-400">
            {{ s.platform }} · {{ s.ipAddress || 'unknown ip' }} · last active
            {{ new Date(s.lastActiveAt).toLocaleString() }}
          </div>
        </div>
        <button
          v-if="!s.current"
          type="button"
          class="px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/40 text-sm text-red-300"
          @click="onRevoke(s.documentId)"
        >
          Revoke
        </button>
      </li>
    </ul>
  </section>
</template>
