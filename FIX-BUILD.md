# 🔧 Build Error Fix Guide

## Quick Fix (Run These Commands)

Open PowerShell in your project directory and run:

```powershell
# Step 1: Clean everything
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Step 2: Clear npm cache
npm cache clean --force

# Step 3: Reinstall dependencies
npm install

# Step 4: Try build again
npm run build
```

## If That Doesn't Work

### Option 1: Check Node/npm Version

```powershell
node --version   # Should be 18.x or higher
npm --version    # Should be 9.x or higher
```

If outdated, download latest from: https://nodejs.org/

### Option 2: Install Missing Dependencies

```powershell
# Make sure all dependencies are installed
npm install react@^18.2.0 react-dom@^18.2.0
npm install lucide-react@^0.309.0
npm install @anthropic-ai/sdk@^0.32.1
npm install react-markdown@^9.0.1
npm install remark-gfm@^4.0.0
npm install date-fns@^3.0.0

# Dev dependencies
npm install --save-dev @types/react@^18.2.43
npm install --save-dev @types/react-dom@^18.2.17
npm install --save-dev typescript@^5.2.2
npm install --save-dev vite@^5.0.8
npm install --save-dev @vitejs/plugin-react@^4.2.1
npm install --save-dev tailwindcss@^3.4.0
npm install --save-dev autoprefixer@^10.4.16
npm install --save-dev postcss@^8.4.32
```

### Option 3: Skip Build Verification

If you just want to run the app (not build it):

```powershell
npm run dev
```

The dev server doesn't require a successful build and will work even with minor TypeScript warnings.

## Common Build Errors & Solutions

### Error: "Cannot find module"

**Solution:**
```powershell
npm install
```

### Error: "TypeScript compilation failed"

**Solution:** Check specific error message and fix the file, or skip type checking temporarily:

Edit `package.json` and change:
```json
"build": "tsc && vite build"
```

To:
```json
"build": "vite build"
```

### Error: "Out of memory"

**Solution:**
```powershell
# Increase Node memory limit
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Error: "EACCES: permission denied"

**Solution:**
```powershell
# Run PowerShell as Administrator, then:
npm cache clean --force
npm install
```

## Verify Fix

After fixing, verify everything works:

```powershell
# Check for TypeScript errors
npx tsc --noEmit

# Try building
npm run build

# If build succeeds, try running
npm run dev
```

## Still Not Working?

### Nuclear Option - Complete Reset

```powershell
# 1. Remove everything
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
Remove-Item -Recurse -Force dist
Remove-Item -Recurse -Force .vite

# 2. Use specific npm version
npm install -g npm@9.8.1

# 3. Reinstall with legacy peer deps
npm install --legacy-peer-deps

# 4. Build
npm run build
```

## Skip Build and Just Run

**You don't need `npm run build` to use the app!**

The build command is only for production deployment. For development:

```powershell
npm run dev
```

This starts the development server at http://localhost:5173 and handles all TypeScript compilation on-the-fly.

## What `npm run build` Does

- Compiles TypeScript to JavaScript
- Bundles all files for production
- Optimizes and minifies code
- Creates `dist/` folder with production files

**For daily use, you only need `npm run dev`!**

## Quick Start Without Build

```powershell
# Just run these two:
npm install
npm run dev

# App launches at http://localhost:5173
```

That's it! No build needed for development.
