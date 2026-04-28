<script setup lang="ts">
import { useOrder } from '~/composables/useOrder';

definePageMeta({ middleware: 'auth', layout: 'back' });

const config = useRuntimeConfig();
if (config.public.appEnv === 'production') {
  throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true });
}

const route = useRoute();
const id = Number(route.params.id);
const orderApi = useOrder();
const toast = useToast();

const { data: order, error, refresh } = await useAsyncData(
  () => `order-pay-${id}`,
  () => orderApi.findOneMine(id),
);

watch(order, (o) => {
  if (o?.paymentStatus === 'paid') {
    navigateTo('/tickets');
  }
}, { immediate: true });

const paying = ref(false);

const onPay = async () => {
  paying.value = true;
  try {
    await orderApi.markPaid(id);
    toast.add({ color: 'green', title: 'Оплата прошла', description: 'Билеты выпущены' });
    await navigateTo('/tickets');
  } catch (err) {
    toast.add({ color: 'red', title: 'Не удалось оплатить' });
  } finally {
    paying.value = false;
  }
};

const onCancel = () => navigateTo('/');
</script>

<template>
  <div class="px-4 py-4 space-y-4">
    <h1 class="text-xl font-semibold">Тестовая оплата</h1>
    <p class="text-sm text-slate-400">
      Платёжный шлюз ещё не подключён. Используйте кнопку ниже,
      чтобы симулировать успешную оплату и получить билеты.
    </p>

    <AppErrorState
      v-if="error"
      title="Заказ не найден"
      :description="error.message"
      @retry="refresh()"
    />
    <OrderSummary v-else-if="order" :order="order" />

    <div v-if="order && order.paymentStatus === 'pending'" class="space-y-2">
      <UButton block size="lg" color="primary" :loading="paying" @click="onPay">
        Симулировать оплату
      </UButton>
      <UButton block color="gray" variant="soft" :disabled="paying" @click="onCancel">
        Отменить
      </UButton>
    </div>
  </div>
</template>
