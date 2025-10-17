#!/bin/bash

# Build the web app
echo "Building web app..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Built files are in the 'dist' directory"
    echo ""
    echo "🚀 Deploy options:"
    echo "  • Vercel: vercel --prod"
    echo "  • Netlify: netlify deploy --prod --dir=dist"
    echo "  • GitHub Pages: Copy dist/ contents to gh-pages branch"
    echo "  • AWS S3: aws s3 sync dist/ s3://your-bucket-name"
else
    echo "❌ Build failed!"
    exit 1
fi