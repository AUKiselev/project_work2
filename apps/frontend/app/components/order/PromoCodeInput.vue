<script setup lang="ts">
import { useCartStore } from '~/stores/cart';
import { useCart } from '~/composables/useCart';
import { formatPrice } from '~/utils/format';

const props = defineProps<{ eventId: number }>();
const cart = useCartStore();
const { applyPromo } = useCart();
const local = ref(cart.promoCode || '');
const pending = ref(false);

const apply = async () => {
  cart.setPromo(local.value);
  if (!cart.promoCode) return;
  pending.value = true;
  try { await applyPromo(props.eventId); }
  finally { pending.value = false; }
};

const reasonText = computed(() => {
  switch (cart.promoApplied?.reason) {
    case 'expired': return 'Промокод истёк';
    case 'limit': return 'Промокод исчерпан';
    case 'not-eligible': return 'Промокод не действует на это мероприятие';
    case 'invalid': return 'Промокод не найден';
    default: return null;
  }
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2">
      <UInput v-model="local" placeholder="Промокод" class="flex-1" :disabled="pending" />
      <UButton color="gray" variant="soft" :loading="pending" @click="apply">Применить</UButton>
    </div>
    <p v-if="cart.promoApplied?.applied" class="text-sm text-emerald-400">
      Применён: −{{ formatPrice(cart.promoApplied.discount, 'RUB') }}
    </p>
    <p v-else-if="reasonText" class="text-sm text-red-400">{{ reasonText }}</p>
  </div>
</template>
