<script setup lang="ts">
import QRCode from 'qrcode';

const props = defineProps<{ payload: string; size?: number }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const render = async () => {
  if (!canvasRef.value || !props.payload) return;
  await QRCode.toCanvas(canvasRef.value, props.payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: props.size ?? 280,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
};

onMounted(render);
watch(() => props.payload, render);

defineExpose({
  toDataUrl: () => canvasRef.value?.toDataURL('image/png'),
});
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="bg-white p-3 rounded-2xl">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>
