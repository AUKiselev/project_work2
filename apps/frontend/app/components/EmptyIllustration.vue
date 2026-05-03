<script setup lang="ts">
import { computed } from 'vue';

type Name = 'favorites' | 'tickets' | 'search' | 'generic';
const props = defineProps<{ name?: Name | string }>();

const valid: Name[] = ['favorites', 'tickets', 'search', 'generic'];
const resolved = computed<Name>(() =>
  valid.includes(props.name as Name) ? (props.name as Name) : 'generic',
);
</script>

<template>
  <div class="size-32 text-slate-500">
    <!-- favorites: сердечко с пунктиром + искры -->
    <svg
      v-if="resolved === 'favorites'"
      data-name="favorites"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <path
        d="M60 100 L25 60 a18 18 0 0 1 35 -10 a18 18 0 0 1 35 10 Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-dasharray="4 3"
      />
      <circle cx="20" cy="30" r="2" class="fill-primary-400/60" />
      <circle cx="100" cy="35" r="2" class="fill-primary-400/60" />
      <circle cx="95" cy="80" r="2" class="fill-primary-400/60" />
    </svg>

    <!-- tickets: билет с перфорацией -->
    <svg
      v-else-if="resolved === 'tickets'"
      data-name="tickets"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <rect
        x="15"
        y="35"
        width="90"
        height="50"
        rx="6"
        stroke="currentColor"
        stroke-width="2"
      />
      <line x1="60" y1="35" x2="60" y2="85" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
      <circle cx="90" cy="60" r="4" class="fill-primary-400/40" />
    </svg>

    <!-- search: лупа -->
    <svg
      v-else-if="resolved === 'search'"
      data-name="search"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <circle cx="50" cy="50" r="25" stroke="currentColor" stroke-width="2" />
      <line x1="70" y1="70" x2="95" y2="95" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      <circle cx="50" cy="50" r="10" class="fill-primary-400/30" />
    </svg>

    <!-- generic: облачко с многоточием -->
    <svg
      v-else
      data-name="generic"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <path
        d="M30 70 a18 18 0 0 1 0 -30 a25 25 0 0 1 50 0 a18 18 0 0 1 0 30 Z"
        stroke="currentColor"
        stroke-width="2"
      />
      <circle cx="45" cy="55" r="3" class="fill-primary-400/60" />
      <circle cx="60" cy="55" r="3" class="fill-primary-400/60" />
      <circle cx="75" cy="55" r="3" class="fill-primary-400/60" />
    </svg>
  </div>
</template>
