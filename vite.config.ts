import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['vite.svg'],
            manifest: {
                name: 'Satoyama Cycling Map',
                short_name: 'SatoyamaMap',
                description: 'Offline-capable cycling map for Tamba-Sasayama',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'vite.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: 'vite.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    }
                ]
            },
            workbox: {
                // Cache Mapbox tiles and other external assets
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'mapbox-tiles',
                            expiration: {
                                maxEntries: 500,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/cyberjapandata\.gsi\.go\.jp\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gsi-tiles',
                            expiration: {
                                maxEntries: 500,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            }
        })
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.indexOf('node_modules') !== -1) {
                        if (id.indexOf('mapbox-gl') !== -1) {
                            return 'mapbox-gl';
                        }
                        if (id.indexOf('react') !== -1) {
                            return 'react-vendor';
                        }
                        return 'vendor';
                    }
                }
            }
        },
        chunkSizeWarningLimit: 1000
    }
})
