<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ capacity: number; remaining: number }>();

const ratio = computed(() => (props.capacity > 0 ? props.remaining / props.capacity : 0));
// capacity=0 = «лимит не задан» (бесплатные мероприятия, открытая продажа) —
// бейдж в этом случае бессмыслен: «осталось N» из несуществующего пула.
const visible = computed(() => props.capacity > 0 && props.remaining > 0 && ratio.value <= 0.2);

const cls = computed(() =>
  ratio.value <= 0.1
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/30',
);

function declension(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'место';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'места';
  return 'мест';
}

const label = computed(() => `Осталось ${props.remaining} ${declension(props.remaining)}`);
</script>

<template>
  <span
    v-if="visible"
    :class="['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cls]"
  >
    {{ label }}
  </span>
</template>
