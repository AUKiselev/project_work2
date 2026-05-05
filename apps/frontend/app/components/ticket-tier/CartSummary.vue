<script setup lang="ts">
import { useCartStore } from '~/stores/cart';
import { formatPrice } from '~/utils/format';

const cart = useCartStore();
const emit = defineEmits<{ checkout: [] }>();
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur lg:static lg:border-t-0 lg:bg-transparent lg:p-0"
    :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }"
  >
    <div class="space-y-1">
      <div class="flex items-center justify-between text-sm text-slate-400">
        <span>Подытог</span>
        <span class="tabular-nums">{{ formatPrice(cart.subtotal, 'RUB') }}</span>
      </div>
      <div v-if="cart.discount > 0" class="flex items-center justify-between text-sm text-emerald-400">
        <span>Скидка</span>
        <span class="tabular-nums">−{{ formatPrice(cart.discount, 'RUB') }}</span>
      </div>
      <div class="flex items-center justify-between font-semibold pt-1">
        <span>Итого</span>
        <span class="tabular-nums">{{ formatPrice(cart.total, 'RUB') }}</span>
      </div>
    </div>
    <UButton
      block
      size="lg"
      color="primary"
      class="mt-3"
      :disabled="cart.isEmpty"
      @click="emit('checkout')"
    >
      Оформить
    </UButton>
  </div>
</template>
