import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { UserConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST ?? false;
const isTauri = Boolean(process.env.TAURI_DEBUG || process.env.TAURI_PLATFORM);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  // Production optimizations
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      input: {
        main: isTauri ? './index.html' : './public/index.html'
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          'react-hot-toast': ['react-hot-toast']
        }
      }
    }
  }
} satisfies UserConfig);