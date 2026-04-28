// Тема Nuxt UI v4: dark-only, primary indigo, gray slate. Менять
// тему нельзя — переключатель не реализуется в v1.
export default defineAppConfig({
  ui: {
    primary: 'indigo',
    gray: 'slate',
    icons: { dynamic: true },
  },
});
