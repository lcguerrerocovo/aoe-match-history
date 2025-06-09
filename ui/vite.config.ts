import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

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
    }
  ],
  server: {
    fs: {
      allow: ['..', '../site', '../data']
    },
    proxy: {
      '/api': {
        target: 'https://aoe-api.worldsedgelink.com/community/leaderboard',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/getRecentMatchHistory'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            console.log('Proxying to:', proxyReq.path);
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('User-Agent', 'aoe2-site');
          });
        }
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
  }
})
