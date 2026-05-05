<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <header class="sticky top-0 z-30 px-3 py-2 flex items-center gap-2 bg-slate-950/95 backdrop-blur border-b border-slate-900">
      <AppBackButton />
      <h1 class="text-base font-medium truncate">
        <slot name="title" />
      </h1>
      <div class="ml-auto flex items-center gap-1">
        <slot name="actions" />
      </div>
    </header>
    <main class="flex-1 pb-20 lg:pb-8">
      <slot />
    </main>
    <AppBottomNav />
  </div>
</template>
