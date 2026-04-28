<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ middleware: 'guest', layout: 'auth' });

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const identifier = ref('');
const password = ref('');
const pending = ref(false);
const errorMsg = ref<string | null>(null);

const onSubmit = async () => {
  errorMsg.value = null;
  pending.value = true;
  try {
    await auth.login({ identifier: identifier.value, password: password.value });
    const redirect = (route.query.redirect as string | undefined) || '/';
    await router.push(redirect);
  } catch (err: any) {
    errorMsg.value = err?.data?.error?.message || 'Login failed';
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <section class="max-w-md mx-auto space-y-4">
    <h1 class="text-2xl font-bold">Log in</h1>
    <form class="space-y-3" @submit.prevent="onSubmit">
      <input
        v-model="identifier"
        type="text"
        placeholder="Email or username"
        autocomplete="username"
        required
        class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        required
        class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
      />
      <button
        type="submit"
        :disabled="pending"
        class="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
      >
        {{ pending ? 'Logging in…' : 'Log in' }}
      </button>
    </form>
    <p v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</p>
  </section>
</template>
