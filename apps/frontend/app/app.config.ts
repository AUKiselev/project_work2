// Тема Nuxt UI v4: dark-only, primary indigo, neutral slate. Менять
// тему нельзя — переключатель не реализуется в v1.
//
// Внимание: в Nuxt UI v4 цвета темы лежат под `ui.colors.{primary,neutral,...}`,
// а не под `ui.primary` / `ui.gray` (как было в v3). Иначе конфиг игнорируется
// и применяется дефолтный primary='green'.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      neutral: 'slate',
    },
    icons: { dynamic: true },
  },
});
