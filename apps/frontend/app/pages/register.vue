<script setup lang="ts">
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'guest', layout: 'auth' });

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const schema = z.object({
  username: z.string().min(3, 'Минимум 3 символа'),
  email: z.string().email('Неверный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

const state = reactive({ username: '', email: '', password: '' });
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    const res = await auth.register({ username: state.username, email: state.email, password: state.password });
    if (!res.jwt) {
      toast.add({ color: 'green', title: 'Подтвердите email', description: 'На вашу почту отправлено письмо' });
      await router.push('/login');
    } else {
      await router.push('/');
    }
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Не удалось зарегистрироваться', description: parsed.message });
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-xl font-semibold">Создать аккаунт</h1>
    </template>
    <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
      <UFormGroup label="Логин" name="username" required>
        <UInput v-model="state.username" autocomplete="username" />
      </UFormGroup>
      <UFormGroup label="Email" name="email" required>
        <UInput v-model="state.email" type="email" autocomplete="email" />
      </UFormGroup>
      <UFormGroup label="Пароль" name="password" required>
        <UInput v-model="state.password" type="password" autocomplete="new-password" />
      </UFormGroup>
      <UButton type="submit" block color="primary" :loading="pending">Создать аккаунт</UButton>
    </UForm>
    <template #footer>
      <p class="text-sm text-slate-400">
        Уже есть аккаунт? <NuxtLink to="/login" class="text-indigo-400">Войти</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
