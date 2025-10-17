# Images Directory

This directory contains visual assets for the extension.

## Required Files

### icon.png ✓ Added

- **Size**: 128x128 pixels
- **Format**: PNG
- **Purpose**: Extension icon shown in marketplace and VSCode
- **Design**: Should represent code notes/annotations
- **Tips**: Simple, recognizable, works on light and dark backgrounds

### Screenshots ✓ Added

Current screenshots:

- `screenshot-add-note.jpg` ✓ - Adding a note via comment UI
- `screenshot-codelens.jpg` ✓ - CodeLens indicator above code
- `screenshot-edit.jpg` ✓ - Editing a note
- `screenshot-history.jpg` ✓ - Viewing note history
- `screenshot-markdown.jpg` ✓ - Markdown formatting in action
- `screenshot-storage.jpg` ✓ - Note files in `.code-notes/` directory

**Guidelines**:

- High resolution (at least 1920x1080)
- Use consistent theme (Dark+ recommended)
- Show realistic code examples
- Highlight extension features clearly

### demo.gif

Animated GIF showing the workflow:

- Duration: 5-10 seconds
- Size: < 5MB
- Shows: Adding a note, CodeLens appearing, editing
- Smooth, deliberate movements

## Creating the Icon

You can use any design tool:

- **Figma**: Free, web-based
- **Sketch**: Mac only
- **GIMP**: Free, cross-platform
- **Photoshop**: Professional

Icon ideas:

- Sticky note with code brackets
- Speech bubble with code symbol
- Document with annotation marker
- Pencil/pen with code brackets

## Taking Screenshots

1. Open VSCode with the extension
2. Use a clean workspace with example code
3. Demonstrate each feature
4. Use built-in screenshot tools or:
   - **Mac**: Cmd+Shift+4
   - **Windows**: Win+Shift+S
   - **Linux**: gnome-screenshot or similar

## Creating the Demo GIF

Tools:

- **Mac**: Kap (https://getkap.co/)
- **Windows**: ScreenToGif (https://www.screentogif.com/)
- **Linux**: Peek (https://github.com/phw/peek)

Workflow to record:

1. Open a code file
2. Select a few lines
3. Press Ctrl+Alt+N (or Cmd+Alt+N)
4. Type a note
5. Click Save
6. Show CodeLens appearing
7. Click CodeLens to expand

## Optimization

Optimize images before committing:

- **PNG**: Use pngquant or TinyPNG
- **GIF**: Use gifsicle or ezgif.com

```bash
# Optimize PNG
pngquant icon.png --output icon.png --force

# Optimize GIF
gifsicle -O3 demo.gif -o demo-optimized.gif
```

## Usage in README

Add to README.md:

```markdown
## Demo

![Demo](images/demo.gif)

## Screenshots

### Adding Notes

![Add Note](images/screenshot-add-note.png)

### CodeLens Integration

![CodeLens](images/screenshot-codelens.png)
```

## Placeholder

Until you create the actual icon, you can use a placeholder:

- Create a simple 128x128 PNG with text "CCN" (Code Context Notes)
- Use a solid background color
- This allows the extension to package without errors

See [docs/MARKETPLACE_PREP.md](../docs/MARKETPLACE_PREP.md) for detailed guidance.
