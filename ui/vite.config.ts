import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// https://vite.dev/config/
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
      name: 'proxy-api',
      configureServer(server) {
        server.middlewares.use('/api', async (req, res) => {
          const targetUrl = 'https://aoe-api.worldsedgelink.com/community/leaderboard/getRecentMatchHistory' + (req.url || '');
          try {
            const response = await fetch(targetUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'aoe2-site'
              }
            });
            if (!response.ok) {
              throw new Error(`API responded with status ${response.status}`);
            }
            const data = await response.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (error: any) {
            console.error('Proxy error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to fetch from API', details: error?.message || 'Unknown error' }));
          }
        });
      }
    }
  ],
  server: {
    fs: {
      allow: ['..', '../site', '../data']
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
