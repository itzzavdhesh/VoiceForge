// Configures Vite for React and proxies local API calls to the Express server.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'VoiceForge',
        short_name: 'VoiceForge',
        description: 'VoiceForge turns typed text into cloned speech and lip-synced call video.',
        display: 'standalone',
        start_url: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000, // 30 MB to allow ONNX wasm file
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,tflite,binarypb,data}']
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001"
    }
  }
});
