import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/leitor-partitura/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TapScore — Leitor de Partituras',
        short_name: 'TapScore',
        description: 'Seu leitor de partituras no tablet: leia, anote e ensaie. Offline e sem cadastro.',
        theme_color: '#0D111C',
        background_color: '#0D111C',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // .mjs é essencial: o worker do pdf.js é emitido como pdf.worker.min-*.mjs.
        // Sem ele no precache o app abre offline mas nenhuma partitura renderiza.
        globPatterns: ['**/*.{js,mjs,css,html,png,svg,ico,woff2,json,wasm}'],
        // o worker do pdf.js passa de 1 MB; o default do Workbox (2 MiB) é apertado demais
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
})
