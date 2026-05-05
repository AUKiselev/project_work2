<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { useOrder } from '~/composables/useOrder';
import { useCartStore } from '~/stores/cart';
import { useAuthStore } from '~/stores/auth';
import type { Attendee, PaymentMethod } from '~/types/api';
import { formatPrice } from '~/utils/format';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'auth', layout: 'back' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const cart = useCartStore();
const auth = useAuthStore();
const eventsApi = useEvents();
const orderApi = useOrder();
const toast = useToast();

const { data: event } = await useAsyncData(
  () => `event-pay-${slug.value}`,
  () => eventsApi.findBySlug(slug.value),
);

onMounted(() => {
  cart.hydrate();
  if (cart.isEmpty || cart.eventSlug !== slug.value) {
    navigateTo(`/events/${slug.value}/checkout`);
  }
});

// Раскручиваем корзину в плоский список билетов.
const flatTickets = computed(() => {
  const arr: Array<{ tierId: number; tierName: string; index: number }> = [];
  for (const item of cart.items) {
    for (let i = 0; i < item.qty; i++) {
      arr.push({ tierId: item.tierId, tierName: item.snapshot.name, index: arr.length });
    }
  }
  return arr;
});

const attendees = ref<Attendee[]>([]);
const valid = ref<boolean[]>([]);
watch(flatTickets, (tickets) => {
  attendees.value = tickets.map((_, i) => attendees.value[i] ?? {
    fullName: i === 0 ? (auth.user?.username || '') : '',
    email: i === 0 ? (auth.user?.email || '') : '',
    phone: '',
  });
  valid.value = tickets.map(() => false);
}, { immediate: true });

const paymentMethod = ref<PaymentMethod>('card');
const consent = ref(false);
const submitting = ref(false);

const allValid = computed(() =>
  valid.value.length > 0 && valid.value.every(Boolean) && consent.value,
);

const onSubmit = async () => {
  if (!event.value || !allValid.value) return;
  submitting.value = true;
  try {
    const order = await orderApi.create({
      eventId: event.value.id,
      items: cart.items.map((i) => ({ tierId: i.tierId, quantity: i.qty })),
      promoCode: cart.promoCode || undefined,
      paymentMethod: paymentMethod.value,
      personalDataConsent: true,
      attendees: attendees.value,
    });
    cart.reset();
    await navigateTo(`/orders/${order.id}/pay`);
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Ошибка оформления', description: parsed.message });
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div v-if="event" class="px-4 py-4 space-y-4 pb-32 lg:pb-8">
    <header class="flex items-start gap-3">
      <div class="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
        <img v-if="event.coverImage?.url" :src="event.coverImage.url" :alt="event.title" class="w-full h-full object-cover" />
      </div>
      <div class="min-w-0">
        <h1 class="font-semibold line-clamp-2">{{ event.title }}</h1>
        <p class="text-xs text-slate-400">{{ event.venue?.name }}</p>
      </div>
    </header>

    <div class="space-y-3">
      <AttendeeForm
        v-for="(t, i) in flatTickets"
        :key="i"
        :title="`Билет ${i + 1} — ${t.tierName}`"
        :model-value="attendees[i]"
        @update:model-value="(v) => attendees[i] = v"
        @update:valid="(v) => valid[i] = v"
      />
    </div>

    <PaymentMethodPicker v-model="paymentMethod" />
    <PersonalDataConsent v-model="consent" />

    <div class="flex items-center justify-between border-t border-slate-800 pt-3">
      <span class="text-sm text-slate-400">Итого</span>
      <span class="font-semibold tabular-nums">{{ formatPrice(cart.total, 'RUB') }}</span>
    </div>

    <UButton
      block
      size="lg"
      color="primary"
      :disabled="!allValid"
      :loading="submitting"
      @click="onSubmit"
    >
      Оплатить
    </UButton>
  </div>
</template>
