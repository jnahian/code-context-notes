# Server-Side Rendering (SSR) Setup

This project now supports Server-Side Rendering with React Router.

## Available Scripts

- `npm run dev` - Standard Vite development server (client-side only)
- `npm run dev:ssr` - Development server with SSR enabled (port 5174)
- `npm run build` - Build both client and server bundles
- `npm run preview:ssr` - Preview production SSR build (port 5173)

## SSR Architecture

### Entry Points

- `src/entry-client.tsx` - Client-side hydration entry point
- `src/entry-server.tsx` - Server-side rendering entry point

### Server

- `server.js` - Express server with Vite SSR middleware
- `server-dev.js` - Development server wrapper

### Key Features

- ✅ Server-side rendering with React Router
- ✅ Client-side hydration
- ✅ Development mode with HMR
- ✅ Production build optimization
- ✅ Static file serving

## Development Workflow

1. **Development with SSR**: `npm run dev:ssr`

   - Full SSR with hot module replacement
   - Server runs on http://localhost:5174

2. **Standard Development**: `npm run dev`

   - Client-side only (faster for development)
   - Server runs on http://localhost:5173

3. **Production Build**: `npm run build`

   - Creates optimized client and server bundles
   - Output: `dist/client/` and `dist/server/`

4. **Production Preview**: `npm run preview:ssr`
   - Tests the production SSR build locally

## Benefits of SSR

- **SEO**: Search engines can crawl pre-rendered content
- **Performance**: Faster initial page load
- **Social Sharing**: Meta tags are rendered server-side
- **Accessibility**: Content available without JavaScript

## Notes

- Removed lazy loading from components for SSR compatibility
- Uses `StaticRouter` on server, `BrowserRouter` on client
- CSS is properly handled in both environments
- All routes are pre-rendered on the server
