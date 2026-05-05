<script setup lang="ts">
import { z } from 'zod';

const { $api } = useNuxtApp();
const toast = useToast();

useHead({ title: 'Контакты — Клуб Спикеров' });

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Некорректный email'),
  message: z.string().min(10, 'Минимум 10 символов'),
});
type Form = z.infer<typeof schema>;
const form = reactive<Form>({ name: '', email: '', message: '' });
const submitting = ref(false);

async function onSubmit() {
  submitting.value = true;
  try {
    await ($api as any)('/manager-contact-requests', {
      method: 'POST',
      body: {
        data: {
          topic: 'Обращение с контактной страницы',
          message: `${form.name} <${form.email}>: ${form.message}`,
          contact: form.email,
        },
      },
    });
    toast.add({ title: 'Сообщение отправлено', color: 'success' });
    form.name = '';
    form.email = '';
    form.message = '';
  } catch {
    toast.add({ title: 'Ошибка отправки', description: 'Попробуйте позже', color: 'error' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AppDecorBackground variant="subtle">
    <div class="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-2">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100">Контакты</h1>
        <div class="prose prose-invert mt-4 max-w-none">
          <p>Свяжитесь с нами удобным способом:</p>
          <ul>
            <li><strong>Email:</strong> hello@club-speakers.ru</li>
            <li><strong>Телефон:</strong> +7 (495) 000-00-00</li>
            <li><strong>Юр. адрес:</strong> 123456, Москва, ул. Образцова, д. 1</li>
          </ul>
        </div>
      </div>
      <UForm :schema="schema" :state="form" class="space-y-4" @submit="onSubmit">
        <h2 class="text-lg font-semibold text-slate-100">Написать нам</h2>
        <UFormField name="name" label="Имя" required>
          <UInput v-model="form.name" placeholder="Ваше имя" />
        </UFormField>
        <UFormField name="email" label="Email" required>
          <UInput v-model="form.email" type="email" placeholder="you@example.com" />
        </UFormField>
        <UFormField name="message" label="Сообщение" required>
          <UTextarea v-model="form.message" :rows="5" placeholder="Чем мы можем помочь?" />
        </UFormField>
        <UButton type="submit" :loading="submitting" color="primary">Отправить</UButton>
      </UForm>
    </div>
  </AppDecorBackground>
</template>
