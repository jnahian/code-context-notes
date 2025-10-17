import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cache the template and render function
let template
let render

export default async function handler(req, res) {
  const url = req.url

  try {
    // Load template if not cached
    if (!template) {
      template = fs.readFileSync(
        path.resolve(__dirname, '../index.html'),
        'utf-8'
      )
    }

    // Load render function if not cached
    if (!render) {
      const serverModule = await import('./server/entry-server.js')
      render = serverModule.render
    }
    
    // Render the app
    const { html: appHtml } = await render(url)

    // Replace the SSR outlet with the rendered HTML
    const html = template.replace('<!--ssr-outlet-->', appHtml)

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    res.status(200).send(html)
  } catch (error) {
    console.error('SSR Error:', error)
    
    // Fallback to client-side rendering
    try {
      const fallbackTemplate = template || fs.readFileSync(
        path.resolve(__dirname, '../index.html'),
        'utf-8'
      )
      
      res.setHeader('Content-Type', 'text/html')
      res.status(200).send(fallbackTemplate)
    } catch (fallbackError) {
      console.error('Fallback Error:', fallbackError)
      res.status(500).send('Internal Server Error')
    }
  }
}