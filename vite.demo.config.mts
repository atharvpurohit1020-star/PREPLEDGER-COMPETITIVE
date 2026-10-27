// Static preview build: one self-contained HTML file with the question snapshot bundled in.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  define: { 'import.meta.env.VITE_STATIC_DEMO': JSON.stringify('1') },
  build: { outDir: 'dist/demo', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 20_000 },
});
