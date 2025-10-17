# Code Context Notes - Web App

This is the landing page and documentation website for the Code Context Notes VS Code extension.

## Tech Stack

- **React 18** - UI framework
- **React Router** - Client-side routing
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   └── Navigation.tsx
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   └── DocsPage.tsx
│   ├── lib/
│   │   └── utils.ts     # Utility functions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Features

### Landing Page
- Hero section with clear value proposition
- Feature highlights with icons
- Quick start guide
- Statistics and social proof
- Call-to-action sections
- Responsive design

### Documentation Page
- Installation instructions
- Quick start guide
- Keyboard shortcuts reference
- Feature explanations
- Usage guide with examples
- Markdown formatting guide
- Configuration options
- FAQ section
- Support links

## Deployment

The app can be deployed to any static hosting service like:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

Build the app with `npm run build` and deploy the `dist/` folder.