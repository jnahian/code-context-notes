import { createServer } from './server.js'

createServer().then(({ app }) =>
  app.listen(5174, () => {
    console.log('SSR Dev Server running at http://localhost:5174')
  })
)