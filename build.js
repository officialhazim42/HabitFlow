/**
 * HabitFlow — Production Build Script
 * Prepares a clean, isolated production distribution in './dist'
 * for Cloudflare Workers Static Assets / Cloudflare Pages.
 *
 * Guarantees:
 * - Excludes node_modules, workerd, server.js, tests, and secrets.
 * - Copies all HTML, CSS, JS, manifest, service worker, and icons.
 * - Preserves all relative paths and PWA capabilities.
 * - Generates Cloudflare _headers file for PWA service worker and caching.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Production files and directories to copy
const PRODUCTION_ENTRIES = [
  // Root HTML Pages
  { src: 'index.html', dest: 'index.html' },
  { src: 'habitflow_auth.html', dest: 'habitflow_auth.html' },
  { src: 'dashboard.html', dest: 'dashboard.html' },
  { src: 'reset-password.html', dest: 'reset-password.html' },
  { src: 'favicon.svg', dest: 'favicon.svg' },

  // PWA Manifests & Service Worker
  { src: 'manifest.webmanifest', dest: 'manifest.webmanifest' },
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'sw.js', dest: 'sw.js' },

  // Directories
  { src: 'assets', dest: 'assets', isDir: true },
  { src: 'pages', dest: 'pages', isDir: true }
];

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build() {
  console.log('=== Building HabitFlow for Production ===\n');

  // 1. Clean previous dist
  if (fs.existsSync(DIST_DIR)) {
    console.log('[1/4] Cleaning existing dist/ directory...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log('[2/4] Created fresh dist/ directory.');

  // 2. Copy production assets
  console.log('[3/4] Copying production assets...');
  let totalFilesCopied = 0;

  for (const entry of PRODUCTION_ENTRIES) {
    const srcPath = path.join(ROOT_DIR, entry.src);
    const destPath = path.join(DIST_DIR, entry.dest);

    if (!fs.existsSync(srcPath)) {
      console.warn(`[WARN] Source file/directory missing: ${entry.src}`);
      continue;
    }

    if (entry.isDir) {
      copyDirRecursive(srcPath, destPath);
      console.log(`  + Copied directory: ${entry.src}/ -> dist/${entry.dest}/`);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  + Copied file: ${entry.src} -> dist/${entry.dest}`);
      totalFilesCopied++;
    }
  }

  // 3. Create Cloudflare _headers file for optimal PWA caching
  const headersContent = `
# Service worker must not be cached aggressively and must have root scope
/sw.js
  Service-Worker-Allowed: /
  Cache-Control: no-cache, no-store, must-revalidate

# Web App Manifest MIME type
/manifest.webmanifest
  Content-Type: application/manifest+json; charset=utf-8
  Cache-Control: public, max-age=86400

# HTML entry points
/*.html
  Cache-Control: no-cache, no-store, must-revalidate

# Static versioned assets
/assets/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
`.trim();

  fs.writeFileSync(path.join(DIST_DIR, '_headers'), headersContent + '\n', 'utf8');
  console.log('  + Generated Cloudflare dist/_headers configuration.');

  // 4. Verify distribution
  console.log('\n[4/4] Verifying production output...');

  function scanDir(dir) {
    let list = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        list = list.concat(scanDir(fullPath));
      } else {
        list.push(fullPath);
      }
    }
    return list;
  }

  const allDistFiles = scanDir(DIST_DIR);
  let totalSizeBytes = 0;
  const MAX_ASSET_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB Cloudflare limit

  for (const filePath of allDistFiles) {
    const stat = fs.statSync(filePath);
    totalSizeBytes += stat.size;
    const relPath = path.relative(DIST_DIR, filePath).replace(/\\/g, '/');

    // Security & sanity checks
    if (stat.size > MAX_ASSET_SIZE_BYTES) {
      throw new Error(`[CRITICAL] Asset exceeds 25 MiB limit: ${relPath} (${(stat.size / 1024 / 1024).toFixed(2)} MiB)`);
    }

    if (relPath.includes('node_modules') || relPath.includes('workerd')) {
      throw new Error(`[CRITICAL] Forbidden dependency leaked into dist/: ${relPath}`);
    }

    if (relPath.startsWith('.env') || relPath.endsWith('.env')) {
      throw new Error(`[CRITICAL] Environment secret leaked into dist/: ${relPath}`);
    }
  }

  console.log(`\n=============================================`);
  console.log(`BUILD SUCCESSFUL!`);
  console.log(`Total production assets: ${allDistFiles.length} files`);
  console.log(`Total distribution size: ${(totalSizeBytes / 1024).toFixed(2)} KiB`);
  console.log(`Target directory: ${DIST_DIR}`);
  console.log(`=============================================\n`);
}

if (require.main === module) {
  try {
    build();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { build };
