/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url';

// Modern equivalent for __dirname in ES Modules
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-data-directory',
      configureServer(server) {
        server.middlewares.use('/data', (req, res) => {
          const dataDir = resolve(__dirname, '../data')
          const filePath = resolve(dataDir, req.url?.slice(1) || '')
          
          if (req.url && req.url.startsWith('/matches/')) {
            const indexPath = resolve(__dirname, '../data/matches/index.json');
            if (fs.existsSync(indexPath)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(indexPath));
            } else {
              res.statusCode = 404;
              res.end('Not found');
            }
            return;
          }

          if (fs.existsSync(filePath)) {
            if (fs.statSync(filePath).isDirectory()) {
              const files = fs.readdirSync(filePath)
                .filter(file => file.endsWith('.json'))
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(files))
            } else {
              res.setHeader('Content-Type', 'application/json')
              res.end(fs.readFileSync(filePath))
            }
          } else {
            res.statusCode = 404
            res.end('Not found')
          }
        })
      }
    },
    {
      name: 'serve-site-directory',
      configureServer(server) {
        server.middlewares.use('/site', (req, res) => {
          const siteDir = resolve(__dirname, '../site')
          const filePath = resolve(siteDir, req.url?.slice(1) || '')
          if (fs.existsSync(filePath)) {
            res.end(fs.readFileSync(filePath))
          } else {
            res.statusCode = 404
            res.end('Not found')
          }
        })
      }
    },
    {
      name: 'serve-assets-directory',
      configureServer(server) {
        server.middlewares.use('/src/assets', (req, res) => {
          const assetsDir = resolve(__dirname, './src/assets')
          const filePath = resolve(assetsDir, req.url?.slice(1) || '')
          
          if (fs.existsSync(filePath)) {
            const ext = filePath.split('.').pop()
            const mimeTypes: Record<string, string> = {
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'svg': 'image/svg+xml',
              'webp': 'image/webp'
            }
            
            res.setHeader('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream')
            res.setHeader('Cache-Control', 'public, max-age=3600') // 1 hour cache for assets
            res.end(fs.readFileSync(filePath))
          } else {
            res.statusCode = 404
            res.end('Asset not found')
          }
        })
      }
    }
  ],
  server: {
    fs: {
      allow: ['..', '../site', '../data']
    },
    proxy: process.env.NODE_ENV === 'test' ? {} : {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**', 'src/services/**'],
      exclude: [
        'src/main.tsx',
        'src/App.tsx',
        'src/test/**',
        'src/theme/**',
        'src/types/**',
        '**/*.cy.tsx',
        '**/*.d.ts'
      ],
      thresholds: {
        lines: 30,
        functions: 65,
        branches: 75,
        statements: 30,
      }
    },
  },
}) 