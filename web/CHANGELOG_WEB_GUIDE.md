# Adding a New Version to the Web Changelog

This guide explains how to add a new version to the changelog timeline on the website (`web/src/pages/ChangelogPage.tsx`).

## Quick Reference

1. Add version to markdown changelog first (`docs/changelogs/vX.Y.Z.md`)
2. Update web changelog page (`web/src/pages/ChangelogPage.tsx`)
3. Position new version at the top of the timeline
4. Update "Latest" badge to new version
5. Choose timeline node color
6. Build and test

---

## Step-by-Step Instructions

### Step 1: Create Markdown Changelog First

Before updating the web page, create the markdown changelog following the template in `docs/changelogs/CHANGELOG_TEMPLATE.md`.

**Location**: `docs/changelogs/vX.Y.Z.md`

### Step 2: Open the Web Changelog File

**File**: `web/src/pages/ChangelogPage.tsx`

**Location to Insert**: Immediately after the `{/* Timeline Items */}` section starts (around line 40-45)

### Step 3: Copy the Version Template

Use this template for a standard version:

```tsx
{/* Version X.Y.Z */}
<div id="vX.Y.Z" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
  {/* Timeline Node */}
  <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
    <div className="w-4 h-4 rounded-full bg-CHOOSE-COLOR border-4 border-white dark:border-slate-900 shadow-lg"></div>
  </div>

  {/* Left Column - Version Info */}
  <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
    <div className="flex md:flex-col md:items-end items-start gap-2">
      <h3 className="text-2xl font-bold flex items-center gap-2 md:flex-row-reverse">
        <span>Version X.Y.Z</span>
        <Badge className="bg-brand-orange">Latest</Badge>
      </h3>
    </div>
    <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
      <Calendar className="h-4 w-4" />
      <span>Month Day, Year</span>
    </div>
    <p className="text-sm text-muted-foreground">
      Brief description of the release (1-2 sentences)
    </p>
  </div>

  {/* Right Column - Changes */}
  <div className="pl-8 md:pl-12">
    <Card className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange">
      <CardContent className="space-y-6">
        {/* Added */}
        <div>
          <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Added</span>
          </h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
              <ICON className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-semibold text-sm">Feature Name</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  Description of the feature
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                  <li>• Key point 1</li>
                  <li>• Key point 2</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Changed */}
        <div>
          <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Changed</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start space-x-2 bg-white dark:bg-slate-800 p-3 rounded-xl">
              <span className="text-blue-500 font-bold">•</span>
              <span className="text-muted-foreground">
                <strong>Change description</strong> - details about the change
              </span>
            </div>
          </div>
        </div>

        {/* Fixed */}
        <div>
          <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
            <Wrench className="h-4 w-4" />
            <span>Fixed</span>
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start space-x-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Bug fix description</span>
            </div>
          </div>
        </div>

        {/* Technical */}
        <div>
          <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400 flex items-center space-x-2">
            <Wrench className="h-4 w-4" />
            <span>Technical</span>
          </h4>
          <div className="space-y-1 text-sm text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded-xl">
            <p>• Technical detail 1</p>
            <p>• Technical detail 2 with <code className="bg-brand-navy text-brand-warm px-1 rounded">code example</code></p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
```

---

## Step 4: Customize Your Version

### 4.1 Update Version Number & ID

Replace all instances of `X.Y.Z` with your version number:
- `id="vX.Y.Z"` → `id="v0.3.0"`
- `<span>Version X.Y.Z</span>` → `<span>Version 0.3.0</span>`

### 4.2 Choose Timeline Node Color

Pick a color for the timeline node from this palette:

| Color Class | Use Case | Example |
|------------|----------|---------|
| `bg-brand-orange` | Major releases, Latest | v0.2.1 |
| `bg-blue-500` | Feature releases | v0.2.0 |
| `bg-orange-500` | Bug fix releases | v0.1.8 |
| `bg-purple-500` | UX improvements | v0.1.7 |
| `bg-pink-500` | Small fixes | v0.1.6 |
| `bg-indigo-500` | Enhancement releases | v0.1.5 |
| `bg-teal-500` | Technical updates | v0.1.4 |
| `bg-cyan-500` | Patch releases | v0.1.1 |
| `bg-green-500` | Initial/milestone releases | v0.1.0 |

**Update the node color**:
```tsx
<div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
```

### 4.3 Update Date

Change the date format to match: `Month Day, Year`
```tsx
<span>November 12, 2025</span>
```

### 4.4 Update Description

Add a concise 1-2 sentence description:
```tsx
<p className="text-sm text-muted-foreground">
  Major feature update with search and filter capabilities
</p>
```

### 4.5 Add Sections

Only include sections that apply to your release:

**Available Sections:**
- **Added** (Green) - New features
- **Changed** (Blue) - Modifications to existing features
- **Fixed** (Green/Orange) - Bug fixes
- **Technical** (Purple) - Internal changes
- **Deprecated** (Yellow) - Features marked for removal
- **Removed** (Red) - Removed features
- **Security** (Red) - Security fixes

**Icons available:**
```tsx
import {
  Calendar,
  Plus,
  Settings,
  Wrench,
  FileText,
  Layers,
  Search,
  MousePointerClick,
  // Add more from lucide-react as needed
} from "lucide-react";
```

---

## Step 5: Update Previous "Latest" Badge

### 5.1 Find the Previous Latest Version

Search for the previous version that has the "Latest" badge.

### 5.2 Remove the Badge

**Before:**
```tsx
<div className="flex md:flex-col md:items-end items-start gap-2">
  <h3 className="text-2xl font-bold flex items-center gap-2 md:flex-row-reverse">
    <span>Version 0.2.1</span>
    <Badge className="bg-brand-orange">Latest</Badge>
  </h3>
</div>
```

**After:**
```tsx
<h3 className="text-2xl font-bold">Version 0.2.1</h3>
```

### 5.3 Remove Special Styling (if applicable)

If the previous version had special gradient styling, change to standard:

**Before:**
```tsx
<Card className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange">
```

**After:**
```tsx
<Card className="bg-white shadow-brand-drop">
```

---

## Step 6: Special Cases

### 6.1 Major Release (1.0.0, 2.0.0, etc.)

For major releases, use a special node and gradient card:

**Special Node:**
```tsx
<div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
  <div className="w-6 h-6 rounded-full bg-green-500 border-4 border-white dark:border-slate-900 shadow-lg flex items-center justify-center">
    <div className="w-2 h-2 rounded-full bg-white"></div>
  </div>
</div>
```

**Special Card:**
```tsx
<Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-green-400 shadow-brand-drop">
```

**Special Badge:**
```tsx
<Badge className="bg-green-600">Major Release</Badge>
```

### 6.2 Patch Release (X.Y.1, X.Y.2, etc.)

Use simpler formatting with fewer details:
- Smaller card
- Focus on "Fixed" section
- Light background color

---

## Step 7: Build and Test

### 7.1 Build the Web Client

```bash
cd web
npm run build:client
```

### 7.2 Check for Errors

- TypeScript compilation errors
- Missing imports
- Incorrect component usage

### 7.3 Test Locally

```bash
npm run dev
```

Navigate to `/changelog` and verify:
- ✅ Timeline renders correctly
- ✅ Node appears at correct position
- ✅ Colors match your choice
- ✅ Content displays properly
- ✅ Responsive layout works on mobile
- ✅ Latest badge appears only on newest version
- ✅ All links and IDs work

---

## Complete Example

Here's a complete example of adding version 0.3.0:

```tsx
{/* Version 0.3.0 */}
<div id="v0.3.0" className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
  {/* Timeline Node */}
  <div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
    <div className="w-4 h-4 rounded-full bg-purple-500 border-4 border-white dark:border-slate-900 shadow-lg"></div>
  </div>

  {/* Left Column - Version Info */}
  <div className="pl-8 md:pl-0 md:pr-12 text-left md:text-right space-y-2">
    <div className="flex md:flex-col md:items-end items-start gap-2">
      <h3 className="text-2xl font-bold flex items-center gap-2 md:flex-row-reverse">
        <span>Version 0.3.0</span>
        <Badge className="bg-brand-orange">Latest</Badge>
      </h3>
    </div>
    <div className="flex items-center gap-2 text-muted-foreground text-sm md:justify-end">
      <Calendar className="h-4 w-4" />
      <span>December 1, 2025</span>
    </div>
    <p className="text-sm text-muted-foreground">
      Major feature update with search and filter capabilities
    </p>
  </div>

  {/* Right Column - Changes */}
  <div className="pl-8 md:pl-12">
    <Card className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange">
      <CardContent className="space-y-6">
        {/* Added */}
        <div>
          <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Added</span>
          </h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
              <Search className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-semibold text-sm">Search and Filter Notes</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  Full-text search across all note content with advanced filtering
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
                  <li>• Filter by author, date range, and file path</li>
                  <li>• Regex pattern matching for power users</li>
                  <li>• Background indexing for instant results</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
```

---

## Checklist

Before committing your changes:

- [ ] Markdown changelog created in `docs/changelogs/`
- [ ] Web changelog updated in `web/src/pages/ChangelogPage.tsx`
- [ ] New version added at the top of timeline
- [ ] Timeline node color chosen
- [ ] Date updated
- [ ] Description added
- [ ] All relevant sections included (Added, Changed, Fixed, etc.)
- [ ] Previous "Latest" badge removed
- [ ] Build succeeds without errors
- [ ] Tested locally on desktop
- [ ] Tested locally on mobile/responsive view
- [ ] All links work (if any)
- [ ] Code examples formatted with proper styling

---

## Common Issues

### Issue: Build fails with TypeScript errors

**Solution**: Check that all icons are imported at the top of the file:
```tsx
import {
  Calendar,
  Plus,
  Settings,
  Wrench,
  // ... add your new icon here
} from "lucide-react";
```

### Issue: Timeline node not appearing

**Solution**: Verify the absolute positioning:
```tsx
<div className="absolute left-0 md:left-[30%] transform -translate-x-1/2 top-2">
```

### Issue: Mobile layout broken

**Solution**: Ensure the grid classes are correct:
```tsx
<div className="relative grid grid-cols-1 md:grid-cols-[30%_70%] gap-8 items-start">
```

### Issue: Card styling inconsistent

**Solution**: Use one of the predefined card styles:
- Latest version: `bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange`
- Standard version: `bg-white shadow-brand-drop`
- Initial release: `bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2 border-green-400`

---

## Questions?

If you encounter issues not covered in this guide:
1. Check existing versions in the file for reference
2. Review the complete example above
3. Test incrementally (add structure first, then content)
4. Use browser DevTools to debug layout issues

---

**Last Updated**: November 12, 2025
**File Location**: `web/src/pages/ChangelogPage.tsx`
