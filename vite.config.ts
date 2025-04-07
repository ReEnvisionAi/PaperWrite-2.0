import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite automatically loads .env variables prefixed with VITE_
// No need for explicit dotenv.config() here for client-side vars

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
