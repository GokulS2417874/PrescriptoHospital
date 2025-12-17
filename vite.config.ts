import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(({ command }) => ({
  plugins: [angular()],
  define: {
    ngDevMode: command === 'serve',
  },
}));