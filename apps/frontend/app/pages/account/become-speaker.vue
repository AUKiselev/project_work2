<script setup lang="ts">
import { z } from 'zod';
import { useSpeakerApplication } from '~/composables/useSpeakerApplication';
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'auth', layout: 'back' });

const auth = useAuthStore();
const { submit } = useSpeakerApplication();
const toast = useToast();

const schema = z.object({
  fullName: z.string().min(2, 'Введите ФИО'),
  email: z.string().email('Неверный email'),
  topic: z.string().optional(),
  description: z.string().optional(),
});

const state = reactive({
  fullName: auth.user?.username || '',
  email: auth.user?.email || '',
  topic: '',
  description: '',
});
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    await submit(state);
    toast.add({ color: 'green', title: 'Заявка отправлена' });
    await navigateTo('/account');
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Не удалось отправить', description: parsed.message });
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <section class="px-4 py-4 space-y-4">
    <h1 class="text-xl font-semibold">Стать спикером</h1>
    <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
      <UFormGroup label="ФИО" name="fullName" required><UInput v-model="state.fullName" /></UFormGroup>
      <UFormGroup label="Email" name="email" required><UInput v-model="state.email" type="email" /></UFormGroup>
      <UFormGroup label="Тема выступления" name="topic"><UInput v-model="state.topic" /></UFormGroup>
      <UFormGroup label="О чём хотите рассказать" name="description"><UTextarea v-model="state.description" :rows="5" /></UFormGroup>
      <UButton type="submit" block color="primary" :loading="pending">Отправить заявку</UButton>
    </UForm>
  </section>
</template>
