import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
  hmrPort
) {
  const app = express()

  let vite
  if (!isProd) {
    // Create Vite server in middleware mode and configure the app type as
    // 'custom', disabling Vite's own HTML serving logic so parent server
    // can take control
    vite = await createViteServer({
      root,
      logLevel: 'info',
      server: {
        middlewareMode: true,
        watch: {
          // During tests we edit the files too fast and sometimes chokidar
          // misses change events, so enforce polling for consistency
          usePolling: true,
          interval: 100
        },
        hmr: {
          port: hmrPort
        }
      },
      appType: 'custom'
    })
    // use vite's connect instance as middleware
    app.use(vite.middlewares)
  } else {
    // In production, serve static files from dist/client
    app.use(express.static(path.resolve(__dirname, 'dist/client')))
  }

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl

    try {
      let template, render
      if (!isProd) {
        // Always read fresh template in dev
        template = fs.readFileSync(
          path.resolve(__dirname, 'index.html'),
          'utf-8'
        )
        template = await vite.transformIndexHtml(url, template)
        render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
      } else {
        template = fs.readFileSync(
          path.resolve(__dirname, 'dist/client/index.html'),
          'utf-8'
        )
        render = (await import('./dist/server/entry-server.js')).render
      }

      const { html: appHtml } = await render(url)

      const html = template.replace(`<!--ssr-outlet-->`, appHtml)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      vite && vite.ssrFixStacktrace(e)
      next(e)
    }
  })

  return { app, vite }
}

if (!process.env.TEST) {
  createServer().then(({ app }) =>
    app.listen(5173, () => {
      console.log('Server running at http://localhost:5173')
    })
  )
}

export { createServer }