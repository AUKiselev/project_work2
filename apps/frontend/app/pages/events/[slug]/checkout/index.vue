<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { useCartStore } from '~/stores/cart';

definePageMeta({ layout: 'back' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const cart = useCartStore();
const eventsApi = useEvents();

const { data: event, error } = await useAsyncData(
  () => `event-checkout-${slug.value}`,
  () => eventsApi.findBySlug(slug.value),
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Мероприятие не найдено', fatal: true });
}

const showSwitchModal = ref(false);

onMounted(() => {
  cart.hydrate();
  if (cart.eventSlug && cart.eventSlug !== slug.value && !cart.isEmpty) {
    showSwitchModal.value = true;
  }
});

const switchEvent = () => {
  cart.reset();
  showSwitchModal.value = false;
};
const goBack = () => navigateTo(`/events/${cart.eventSlug}/checkout`);

const sortedTiers = computed(() =>
  [...(event.value?.tiers ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
);

const onQty = (tierId: number, qty: number) => {
  if (!event.value) return;
  const tier = sortedTiers.value.find((t) => t.id === tierId);
  if (!tier) return;
  if (cart.byTier(tierId)) cart.setQty(tierId, qty);
  else if (qty > 0) cart.add(tier, qty, slug.value);
};

const proceed = async () => {
  await navigateTo(`/events/${slug.value}/checkout/pay`);
};
</script>

<template>
  <div v-if="event" class="px-4 py-4 space-y-4 pb-44 lg:pb-8">
    <h1 class="text-xl font-semibold">{{ event.title }}</h1>

    <div class="space-y-3">
      <TierAccordion
        v-for="t in sortedTiers"
        :key="t.id"
        :tier="t"
        :qty="cart.byTier(t.id)?.qty ?? 0"
        @update:qty="(v) => onQty(t.id, v)"
      />
    </div>

    <PromoCodeInput :event-id="event.id" />

    <CartSummary @checkout="proceed" />

    <UModal v-model="showSwitchModal" prevent-close>
      <UCard>
        <template #header>
          <p class="font-semibold">Переключить мероприятие?</p>
        </template>
        <p class="text-sm">
          У вас есть выбор билетов на другое мероприятие.
          Очистить корзину и продолжить?
        </p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="goBack">Назад</UButton>
            <UButton color="primary" @click="switchEvent">Очистить</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
