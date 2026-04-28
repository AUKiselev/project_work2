import { mergeConfig, type UserConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Workaround upstream packaging bug in @mux/mux-video@0.22.0:
// its package.json declares `"import": "./dist/index.mjs"`, but `index.mjs`
// is missing from the shipped tarball — only `index.cjs.js` is present.
// `@strapi/upload`'s asset-preview component pulls it transitively via
// `@mux/mux-player-react`, breaking the admin Vite/Rollup bundle.
// Force resolution to the CJS entry; Vite handles the interop.
const muxVideoCjs = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../node_modules/@mux/mux-video/dist/index.cjs.js',
);

export default (config: UserConfig) => {
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@mux/mux-video': muxVideoCjs,
      },
    },
  });
};
