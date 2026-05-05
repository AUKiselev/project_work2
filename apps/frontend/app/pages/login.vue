<script setup lang="ts">
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'guest', layout: 'auth' });

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const schema = z.object({
  identifier: z.string().min(1, 'Введите email или логин'),
  password: z.string().min(1, 'Введите пароль'),
});

const state = reactive({ identifier: '', password: '' });
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    await auth.login({ identifier: state.identifier, password: state.password });
    const redirect = (route.query.redirect as string | undefined) || '/';
    await router.push(redirect);
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Не удалось войти', description: parsed.message });
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-xl font-semibold">Вход</h1>
    </template>
    <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
      <UFormField label="Email или логин" name="identifier" required>
        <UInput v-model="state.identifier" autocomplete="username" />
      </UFormField>
      <UFormField label="Пароль" name="password" required>
        <UInput v-model="state.password" type="password" autocomplete="current-password" />
      </UFormField>
      <UButton type="submit" block color="primary" :loading="pending">Войти</UButton>
    </UForm>
    <template #footer>
      <div class="my-4 flex items-center gap-3">
        <div class="h-px flex-1 bg-slate-800" />
        <span class="text-xs text-slate-500">или</span>
        <div class="h-px flex-1 bg-slate-800" />
      </div>
      <UButton to="/register" variant="ghost" color="primary" block>
        Создать аккаунт
      </UButton>
      <p class="mt-2 text-center text-xs text-slate-500">
        Регистрация по email
      </p>
    </template>
  </UCard>
</template>
