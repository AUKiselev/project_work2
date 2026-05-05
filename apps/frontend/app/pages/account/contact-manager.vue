<script setup lang="ts">
import { z } from 'zod';
import { useManagerContact } from '~/composables/useManagerContact';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'auth', layout: 'back' });

const { submit } = useManagerContact();
const toast = useToast();

const schema = z.object({
  subject: z.string().min(2, 'Введите тему'),
  message: z.string().min(2, 'Введите сообщение'),
  contactBack: z.string().optional(),
});

const state = reactive({ subject: '', message: '', contactBack: '' });
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    await submit(state);
    toast.add({ color: 'green', title: 'Сообщение отправлено' });
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
  <AppDecorBackground variant="subtle">
    <section class="px-4 py-4 space-y-4">
      <h1 class="text-xl font-semibold">Связаться с менеджером</h1>
      <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
        <UFormGroup label="Тема" name="subject" required><UInput v-model="state.subject" /></UFormGroup>
        <UFormGroup label="Сообщение" name="message" required><UTextarea v-model="state.message" :rows="5" /></UFormGroup>
        <UFormGroup label="Как с вами связаться (телефон/email)" name="contactBack"><UInput v-model="state.contactBack" /></UFormGroup>
        <UButton type="submit" block color="primary" :loading="pending">Отправить</UButton>
      </UForm>
    </section>
  </AppDecorBackground>
</template>
