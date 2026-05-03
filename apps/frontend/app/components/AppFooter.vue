<script setup lang="ts">
const platformLinks = [
  { to: '/info/about', label: 'О нас' },
  { to: '/info/contacts', label: 'Контакты' },
  { to: '/account/become-speaker', label: 'Стать спикером' },
];
const docsLinks = [
  { to: '/info/terms', label: 'Пользовательское соглашение' },
  { to: '/info/offer', label: 'Публичная оферта' },
];
const socialLinks = [
  { href: 'https://t.me/club_speakers', icon: 'i-simple-icons-telegram', label: 'Telegram' },
  { href: 'https://vk.com/club_speakers', icon: 'i-simple-icons-vk', label: 'VK' },
  { href: 'https://youtube.com/@club_speakers', icon: 'i-simple-icons-youtube', label: 'YouTube' },
];
</script>

<template>
  <footer class="hidden border-t border-slate-800 bg-slate-950 lg:block">
    <div class="container mx-auto grid grid-cols-4 gap-8 px-4 py-10">
      <div>
        <div class="text-lg font-semibold text-slate-100">Клуб Спикеров</div>
        <p class="mt-2 text-sm text-slate-400">
          Платформа продажи билетов на конференции, митапы и выступления спикеров.
        </p>
      </div>
      <div>
        <div class="mb-3 text-sm font-semibold text-slate-200">Платформа</div>
        <ul class="space-y-2 text-sm text-slate-400">
          <li v-for="link in platformLinks" :key="link.to">
            <NuxtLink :to="link.to" class="hover:text-slate-100">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <div class="mb-3 text-sm font-semibold text-slate-200">Документы</div>
        <ul class="space-y-2 text-sm text-slate-400">
          <li v-for="link in docsLinks" :key="link.to">
            <NuxtLink :to="link.to" class="hover:text-slate-100">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <div class="mb-3 text-sm font-semibold text-slate-200">Соцсети</div>
        <ul class="flex gap-3">
          <li v-for="s in socialLinks" :key="s.href">
            <a
              :href="s.href"
              :aria-label="s.label"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex size-9 items-center justify-center rounded-full border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-100"
            >
              <UIcon :name="s.icon" class="size-5" />
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div class="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
      © 2026 Клуб Спикеров. Все права защищены.
    </div>
  </footer>
</template>
