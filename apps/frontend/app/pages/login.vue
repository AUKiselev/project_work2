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
      <UFormGroup label="Email или логин" name="identifier" required>
        <UInput v-model="state.identifier" autocomplete="username" />
      </UFormGroup>
      <UFormGroup label="Пароль" name="password" required>
        <UInput v-model="state.password" type="password" autocomplete="current-password" />
      </UFormGroup>
      <UButton type="submit" block color="primary" :loading="pending">Войти</UButton>
    </UForm>
    <template #footer>
      <p class="text-sm text-slate-400">
        Нет аккаунта? <NuxtLink to="/register" class="text-indigo-400">Зарегистрироваться</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
