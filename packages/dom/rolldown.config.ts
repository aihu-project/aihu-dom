import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

export default defineConfig({
  input: {
    index: 'src/index.ts',
    hydrate: 'src/hydrate.ts',
    progressive: 'src/progressive.ts',
    signals: 'src/signals.ts',
    reactive: 'src/reactive.ts',
  },
  output: { dir: 'dist', format: 'esm', sourcemap: true, minify: true },
  plugins: [dts()],
  external: [
    '@aihu/arbor',
    '@aihu/arbor/hydrate',
    '@aihu/arbor/progressive',
    '@aihu/reactive',
    '@aihu/signals',
  ],
})
