import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle @94cram packages, keep dotenv and other ESM-problematic deps external
  noExternal: [/^@94cram\//],
  external: [/^(?:dotenv|.*\/dotenv)$/],
});
