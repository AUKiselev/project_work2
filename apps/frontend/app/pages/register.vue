<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ middleware: 'guest' });

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const email = ref('');
const password = ref('');
const pending = ref(false);
const errorMsg = ref<string | null>(null);

const onSubmit = async () => {
  errorMsg.value = null;
  pending.value = true;
  try {
    const res = await auth.register({
      username: username.value,
      email: email.value,
      password: password.value,
    });
    // Если включено email-confirmation, jwt не выдаётся — отправляем на /login.
    if (!res.jwt) {
      await router.push('/login');
    } else {
      await router.push('/');
    }
  } catch (err: any) {
    errorMsg.value = err?.data?.error?.message || 'Registration failed';
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <section class="max-w-md mx-auto space-y-4">
    <h1 class="text-2xl font-bold">Create account</h1>
    <form class="space-y-3" @submit.prevent="onSubmit">
      <input
        v-model="username"
        type="text"
        placeholder="Username"
        autocomplete="username"
        required
        class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
      />
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        autocomplete="email"
        required
        class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="new-password"
        required
        minlength="6"
        class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
      />
      <button
        type="submit"
        :disabled="pending"
        class="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
      >
        {{ pending ? 'Creating…' : 'Create account' }}
      </button>
    </form>
    <p v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</p>
  </section>
</template>
