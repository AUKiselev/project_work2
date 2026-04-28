<script setup lang="ts">
const router = useRouter();

const onBack = () => {
  if (history.state?.back) router.back();
  else navigateTo('/');
};
</script>

<template>
  <UButton
    color="gray"
    variant="ghost"
    icon="i-heroicons-arrow-left"
    aria-label="Назад"
    @click="onBack"
  />
</template>
