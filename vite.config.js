import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const resourcesDir = path.resolve(rootDir, 'resources');
const publicDir = path.resolve(rootDir, 'public');
const publicAssetsDir = path.resolve(publicDir, 'assets');

function cleanPublicAssets() {
    return {
        name: 'clean-public-assets',
        apply: 'build',
        buildStart() {
            if (fs.existsSync(publicAssetsDir)) {
                fs.rmSync(publicAssetsDir, { recursive: true, force: true });
            }
        },
    };
}

export default defineConfig({
    root: resourcesDir,
    publicDir: false,
    plugins: [cleanPublicAssets(), react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(resourcesDir, 'js'),
        },
    },
    build: {
        outDir: publicDir,
        emptyOutDir: false,
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
