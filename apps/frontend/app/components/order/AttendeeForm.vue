<script setup lang="ts">
import { z } from 'zod';
import type { Attendee } from '~/types/api';

const props = defineProps<{ modelValue: Attendee; title: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: Attendee]; 'update:valid': [value: boolean] }>();

const schema = z.object({
  fullName: z.string().min(2, 'Введите ФИО'),
  email: z.string().email('Неверный email').optional().or(z.literal('')),
  phone: z.string().min(0).optional().or(z.literal('')),
});

const local = reactive<Attendee>({ ...props.modelValue });

watch(local, (v) => {
  emit('update:modelValue', { ...v });
  const result = schema.safeParse(v);
  emit('update:valid', result.success);
}, { deep: true, immediate: true });
</script>

<template>
  <UCard>
    <template #header>
      <p class="font-semibold">{{ title }}</p>
    </template>
    <UForm :schema="schema" :state="local" class="space-y-3">
      <UFormGroup label="ФИО" name="fullName" required>
        <UInput v-model="local.fullName" autocomplete="name" />
      </UFormGroup>
      <UFormGroup label="Email" name="email">
        <UInput v-model="local.email" type="email" autocomplete="email" />
      </UFormGroup>
      <UFormGroup label="Телефон" name="phone">
        <UInput v-model="local.phone" type="tel" autocomplete="tel" />
      </UFormGroup>
    </UForm>
  </UCard>
</template>
