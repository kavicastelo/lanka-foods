import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Pure React + Vite configuration for independent production deployment
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('recharts') || id.includes('d3')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('@stripe') || id.includes('stripe')) {
                            return 'vendor-stripe';
                        }
                        if (id.includes('leaflet') || id.includes('react-leaflet')) {
                            return 'vendor-maps';
                        }
                    }
                },
            },
        },
    },
});
