# Vercel SSR Deployment Guide

This guide covers deploying your React Router SSR application to Vercel.

## Prerequisites

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)

1. **Connect to Git Repository**

   - Push your code to GitHub/GitLab/Bitbucket
   - Import project in Vercel dashboard
   - Set root directory to `web/`

2. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist/client`
   - Install Command: `npm install`

### Option 2: Manual Deployment

1. **Build for Vercel**

   ```bash
   cd web
   npm run build:vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

## Configuration Files

- `vercel.json` - Vercel configuration
- `api/ssr.js` - Serverless function for SSR

## Key Features

✅ **Server-Side Rendering**: All routes are pre-rendered
✅ **Static Assets**: Optimized serving of CSS, JS, images
✅ **Caching**: Smart caching with stale-while-revalidate
✅ **Fallback**: Client-side rendering if SSR fails
✅ **Performance**: Edge functions for global distribution

## Environment Variables

No environment variables required for basic setup.

## Troubleshooting

### Build Issues

- Ensure all dependencies are in `dependencies`, not `devDependencies`
- Check that TypeScript compiles without errors

### Runtime Issues

- Check Vercel function logs in dashboard
- Verify all imports use relative paths
- Ensure React Router routes match your application

### Performance

- Static assets are automatically optimized
- SSR responses are cached for 60 seconds
- Use Vercel Analytics for monitoring

## Monitoring

- **Vercel Dashboard**: View deployments and function logs
- **Real User Monitoring**: Enable Vercel Analytics
- **Performance**: Monitor Core Web Vitals

## Custom Domain

1. Add domain in Vercel dashboard
2. Configure DNS records as instructed
3. SSL certificates are automatically provisioned

## Scaling

Vercel automatically scales based on traffic:

- **Edge Functions**: Global distribution
- **Automatic Scaling**: No configuration needed
- **Cold Starts**: Minimized with function warming
