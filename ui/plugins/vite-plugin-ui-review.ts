import type { Plugin, ViteDevServer } from 'vite'
import fs from 'fs'
import path from 'path'
import type { ServerResponse } from 'http'

/** Resolve the annotations file path from the Vite root (ui/) to the project root */
export function resolveAnnotationsPath(viteRoot: string): string {
  return path.resolve(viteRoot, '..', '.ui-review', 'annotations.json')
}

/** Write annotations array to disk */
export function handleAnnotationsPost(annotations: unknown[], filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(annotations, null, 2))
}

/** Read annotations from disk, returning empty array if file missing */
export function handleAnnotationsGet(filePath: string): unknown[] {
  if (!fs.existsSync(filePath)) return []
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/** Delete annotation file */
export function handleClear(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

/** Collect request body as a string */
function collectBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

export function uiReviewPlugin(): Plugin {
  let annotationsPath: string
  let server: ViteDevServer

  return {
    name: 'vite-plugin-ui-review',
    apply: 'serve', // dev only — no-op in build

    configResolved(config) {
      annotationsPath = resolveAnnotationsPath(config.root)
    },

    transform(code, id) {
      // Only tag user source files — skip node_modules and the overlay itself
      if (id.includes('node_modules')) return null
      if (!id.includes('/ui/src/') || id.includes('/ui/src/dev/')) return null
      if (!/\.[tj]sx?$/.test(id)) return null

      const exports: string[] = []

      // export function Foo / export default function Foo
      for (const m of code.matchAll(/export\s+(?:default\s+)?function\s+([A-Z]\w+)/g)) {
        exports.push(m[1])
      }
      // export const Foo =
      for (const m of code.matchAll(/export\s+const\s+([A-Z]\w+)\s*[=:]/g)) {
        exports.push(m[1])
      }

      if (exports.length === 0) return null

      const tags = exports.map(n => `try{${n}.__userModule=true}catch(e){}`).join(';')
      return { code: code + '\n' + tags + '\n', map: null }
    },

    configureServer(srv) {
      server = srv

      srv.middlewares.use(async (req, res, next) => {
        const url = req.url

        if (url === '/__ui-review/annotations' && req.method === 'POST') {
          const body = await collectBody(req)
          const annotations = JSON.parse(body)
          handleAnnotationsPost(annotations, annotationsPath)
          sendJson(res, { ok: true })
          return
        }

        if (url === '/__ui-review/annotations' && req.method === 'GET') {
          const annotations = handleAnnotationsGet(annotationsPath)
          sendJson(res, annotations)
          return
        }

        if (url === '/__ui-review/clear' && req.method === 'POST') {
          handleClear(annotationsPath)
          sendJson(res, { ok: true })
          return
        }

        if (url === '/__ui-review/activate' && req.method === 'POST') {
          const body = await collectBody(req)
          const data = body ? JSON.parse(body) : {}
          server.ws.send({ type: 'custom', event: 'ui-review:activate', data })
          sendJson(res, { ok: true })
          return
        }

        next()
      })
    },

    transformIndexHtml() {
      // Inject overlay entry — a real .ts file so Vite processes it through
      // its module pipeline (resolves bare imports like 'react')
      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: '/src/dev/overlay-entry.ts' },
          injectTo: 'body' as const,
        },
      ]
    },
  }
}

function sendJson(res: ServerResponse, data: unknown): void {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}
