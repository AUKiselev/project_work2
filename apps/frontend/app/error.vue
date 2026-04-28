<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message?: string } }>();

const handleHome = () => clearError({ redirect: '/' });
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4 py-8 gap-4">
    <UIcon
      :name="error.statusCode === 404 ? 'i-heroicons-magnifying-glass' : 'i-heroicons-exclamation-triangle'"
      class="w-16 h-16 text-slate-500"
    />
    <h1 class="text-2xl font-semibold">
      {{ error.statusCode === 404 ? 'Страница не найдена' : 'Что-то пошло не так' }}
    </h1>
    <p v-if="error.message" class="text-sm text-slate-400 text-center max-w-sm">{{ error.message }}</p>
    <UButton color="primary" @click="handleHome">На главную</UButton>
  </div>
</template>
