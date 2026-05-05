<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="flex items-start gap-2 text-sm">
    <UCheckbox
      :model-value="modelValue"
      @update:model-value="(v) => emit('update:modelValue', !!v)"
    />
    <span>
      Согласен на обработку персональных данных в соответствии с
      <a href="#" class="underline">политикой конфиденциальности</a>.
    </span>
  </label>
</template>
