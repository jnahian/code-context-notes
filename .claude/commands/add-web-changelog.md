You are tasked with automatically adding a new version entry to the web changelog page.

## Command Usage
```
/add-web-changelog <version>
```
Example: `/add-web-changelog 0.3.0`

## Process

### Step 1: Read and Parse Markdown Changelog
1. Read the markdown changelog file from `docs/changelogs/v{version}.md`
2. Extract the following information:
   - **Version number**: From the `## [X.Y.Z]` heading
   - **Date**: From the `## [X.Y.Z] - YYYY-MM-DD` heading (convert to "Month Day, Year" format)
   - **Description**: Generate a concise 1-2 sentence summary based on the main features in the "Added" section
   - **All sections**: Parse all markdown sections (Added, Changed, Fixed, Technical, etc.)

### Step 2: Map Markdown Sections to TSX
Map each markdown section to its corresponding TSX component with appropriate icons and colors:

| Markdown Section | TSX Section | Color | Icon |
|-----------------|-------------|-------|------|
| Added | Added | green-600 | Plus |
| Changed | Changed | blue-600 | Settings |
| Fixed | Fixed | green-600 | Wrench |
| Technical | Technical | purple-600 | Wrench |
| Deprecated | Deprecated | yellow-600 | AlertTriangle |
| Removed | Removed | red-600 | Trash2 |
| Security | Security | red-600 | Shield |
| Testing | Technical | purple-600 | Wrench |

**Icons to import** (add only the ones needed):
```tsx
import {
  Calendar,
  Plus,
  Settings,
  Wrench,
  AlertTriangle,
  Trash2,
  Shield,
  FileText,
  Layers,
  Search,
  MousePointerClick,
} from "lucide-react";
```

### Step 3: Choose Timeline Node Color
Select an appropriate color for the timeline node based on the version type:

| Color Class | Use Case |
|------------|----------|
| `bg-brand-orange` | Major releases, Latest (default) |
| `bg-blue-500` | Feature releases (if multiple "Added" items) |
| `bg-orange-500` | Bug fix releases (if mostly "Fixed" items) |
| `bg-purple-500` | UX improvements |
| `bg-green-500` | Initial/milestone releases (X.0.0) |
| `bg-indigo-500` | Enhancement releases |
| `bg-teal-500` | Technical updates (if mostly "Technical" items) |

**Default to `bg-brand-orange` for the latest version.**

### Step 4: Generate TSX Code
Using the template from `web/CHANGELOG_WEB_GUIDE.md`, generate the complete TSX code for the new version entry.

**Key formatting rules:**
- For **Added** section items with sub-bullets:
  ```tsx
  <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl">
    <ICON className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
    <div>
      <h5 className="font-semibold text-sm">Feature Name</h5>
      <p className="text-sm text-muted-foreground mt-1">
        Description
      </p>
      <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-3">
        <li>• Sub-point 1</li>
        <li>• Sub-point 2</li>
      </ul>
    </div>
  </div>
  ```

- For **Changed** section items:
  ```tsx
  <div className="flex items-start space-x-2 bg-white dark:bg-slate-800 p-3 rounded-xl">
    <span className="text-blue-500 font-bold">•</span>
    <span className="text-muted-foreground">
      <strong>Change description</strong> - details
    </span>
  </div>
  ```

- For **Fixed** section items:
  ```tsx
  <div className="flex items-start space-x-2">
    <span className="text-green-500 font-bold">✓</span>
    <span>Bug fix description</span>
  </div>
  ```

- For **Technical** section items:
  ```tsx
  <div className="space-y-1 text-sm text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded-xl">
    <p>• Technical detail 1</p>
    <p>• Technical detail 2</p>
  </div>
  ```

- **Latest version styling**:
  - Include the `<Badge className="bg-brand-orange">Latest</Badge>`
  - Use special card styling: `className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange"`

### Step 5: Update ChangelogPage.tsx
1. Read `web/src/pages/ChangelogPage.tsx`
2. Find the `{/* Timeline Items */}` comment (around line 40-45)
3. Insert the new version TSX code immediately after this comment
4. Find the previous "Latest" version entry
5. Remove the "Latest" badge from the previous version:
   - Change from:
     ```tsx
     <h3 className="text-2xl font-bold flex items-center gap-2 md:flex-row-reverse">
       <span>Version X.Y.Z</span>
       <Badge className="bg-brand-orange">Latest</Badge>
     </h3>
     ```
   - To:
     ```tsx
     <h3 className="text-2xl font-bold">Version X.Y.Z</h3>
     ```
6. Update the previous version's card styling from special gradient to standard:
   - From: `className="shadow-brand-drop bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-brand-orange"`
   - To: `className="bg-white shadow-brand-drop"`

### Step 6: Verify Icons Are Imported
Check that all required icons are imported at the top of `ChangelogPage.tsx`. Add any missing icons to the import statement.

### Step 7: Build and Verify
1. Run `npm run build:client` from the `web` directory to verify no TypeScript errors
2. If successful, report the changes made
3. If errors occur, fix them and rebuild

## Important Notes
- **Only include sections that exist** in the markdown changelog (don't generate empty sections)
- **Preserve exact formatting** from the guide for consistency
- **Handle edge cases**:
  - If no "Added" section exists, generate a description from "Changed" or "Fixed"
  - If parsing fails, report the error clearly
  - If `ChangelogPage.tsx` structure differs, adapt the insertion logic
- **Icon mapping**: Choose appropriate icons for features in the "Added" section based on keywords:
  - Search/Filter → Search
  - Click/Interaction → MousePointerClick
  - View/Display → FileText
  - Layer/Structure → Layers
  - Default → Plus

## Output
After completion, provide:
1. ✅ Version added: vX.Y.Z
2. ✅ Location: web/src/pages/ChangelogPage.tsx
3. ✅ Previous "Latest" badge removed from vX.Y.Z
4. ✅ Build status: Success/Failed
5. Summary of changes made

## Error Handling
If any step fails:
- Report the specific error with file/line context
- Suggest corrective action
- Do not proceed to subsequent steps
