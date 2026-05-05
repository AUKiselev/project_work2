<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
await navigateTo('/account/sessions', { replace: true });
</script>
<template><div /></template>
