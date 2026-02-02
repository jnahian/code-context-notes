import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function handler(req, res) {
  const url = req.url || '/'

  try {
    // Read the HTML template
    // build:vercel copies index.html to project root, so we need to go up from api/ to root
    const templatePath = path.join(__dirname, '..', 'index.html')
    const template = fs.readFileSync(templatePath, 'utf-8')

    // Try to import and use the SSR render function
    try {
      const { render } = await import('../server/entry-server.js')
      const { html: appHtml } = await render(url)
      
      // Replace the SSR outlet with rendered content
      const html = template.replace('<!--ssr-outlet-->', appHtml)
      
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
      return res.status(200).send(html)
    } catch (ssrError) {
      console.warn('SSR failed, falling back to CSR:', ssrError.message)
      
      // Fallback to client-side rendering
      res.setHeader('Content-Type', 'text/html')
      return res.status(200).send(template)
    }
  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}