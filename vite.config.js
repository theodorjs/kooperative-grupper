import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relativ base fungerer på GitHub Pages uansett hva repoet heter
// (https://<bruker>.github.io/Kooperative-Grupper/), fordi appen ikke har ruter.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
