/**
 * HabitFlow — Comprehensive PWA Automated Verification Suite
 * Verifies Web App Manifest, Service Worker implementation, App Icons,
 * HTTP server MIME types & headers, Multi-Platform Installation Guide (Desktop, Android, iOS),
 * Modal Event Handling (Got It, Close X, Back, Escape, Backdrop), Form Isolation,
 * and Zero-Emoji Compliance across the entire codebase.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

async function fetchEndpoint(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = Buffer.alloc(0);
      res.on('data', chunk => {
        data = Buffer.concat([data, chunk]);
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    }).on('error', reject);
  });
}

async function runPwaVerification() {
  console.log('=== Starting HabitFlow PWA Verification Suite ===\n');

  // 1. Verify Manifest files
  console.log('--- 1. Testing Web App Manifest Files ---');
  const manifestWebmanifestPath = path.join(__dirname, 'manifest.webmanifest');
  const manifestJsonPath = path.join(__dirname, 'manifest.json');

  assert(fs.existsSync(manifestWebmanifestPath), 'manifest.webmanifest must exist');
  assert(fs.existsSync(manifestJsonPath), 'manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestWebmanifestPath, 'utf8'));
  assert(manifest.name === 'HabitFlow', 'Manifest name must be HabitFlow');
  assert(manifest.short_name === 'HabitFlow', 'Manifest short_name must be HabitFlow');
  assert(manifest.display === 'standalone', 'Manifest display must be standalone');
  assert(manifest.background_color.toUpperCase() === '#0B1220', 'Manifest background_color must be #0B1220');
  assert(manifest.theme_color.toUpperCase() === '#0B1220', 'Manifest theme_color must be #0B1220');
  assert(manifest.start_url === 'index.html' || manifest.start_url === './index.html', 'start_url must point to index.html');
  assert(manifest.scope === './', 'scope must be relative ./ for subpath portability');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Manifest must declare at least 4 icon configurations');

  const icon192 = manifest.icons.find(i => i.sizes === '192x192' && (!i.purpose || i.purpose === 'any'));
  const icon512 = manifest.icons.find(i => i.sizes === '512x512' && (!i.purpose || i.purpose === 'any'));
  const maskable192 = manifest.icons.find(i => i.sizes === '192x192' && i.purpose === 'maskable');
  const maskable512 = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'maskable');

  assert(icon192, 'Manifest must have 192x192 standard icon');
  assert(icon512, 'Manifest must have 512x512 standard icon');
  assert(maskable192, 'Manifest must have 192x192 maskable icon');
  assert(maskable512, 'Manifest must have 512x512 maskable icon');

  console.log('[PASS] Web App Manifest structure, colors, icons, and display mode verified.');

  // 2. Verify App Icons on Filesystem
  console.log('\n--- 2. Testing App Icons on Disk ---');
  const requiredIcons = [
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'assets/icons/icon-maskable-192.png',
    'assets/icons/icon-maskable-512.png',
    'assets/icons/apple-touch-icon.png',
    'assets/icons/favicon.svg'
  ];

  for (const relPath of requiredIcons) {
    const fullPath = path.join(__dirname, relPath);
    assert(fs.existsSync(fullPath), `Icon file must exist: ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert(stat.size > 500, `Icon file must have valid content (>500 bytes): ${relPath} (${stat.size} bytes)`);
  }
  console.log('[PASS] All 6 required application icons exist with valid non-zero file sizes.');

  // 3. Verify Service Worker Implementation
  console.log('\n--- 3. Testing Service Worker (sw.js) Architecture ---');
  const swPath = path.join(__dirname, 'sw.js');
  assert(fs.existsSync(swPath), 'sw.js must exist');
  const swContent = fs.readFileSync(swPath, 'utf8');

  assert(swContent.includes('CACHE_NAME'), 'SW must define versioned CACHE_NAME');
  assert(swContent.includes('PRECACHE_ASSETS'), 'SW must define precache asset array');
  assert(swContent.includes('self.skipWaiting()'), 'SW must support skipWaiting');
  assert(swContent.includes('self.clients.claim()'), 'SW must claim clients upon activation');
  assert(swContent.includes('supabase.co'), 'SW must explicitly exclude remote Supabase backend from cache');
  assert(swContent.includes('/auth/v1'), 'SW must exclude Supabase auth endpoint from cache');
  assert(swContent.includes('navigate'), 'SW must handle navigation requests');
  assert(swContent.includes('You are currently offline'), 'SW must provide styled offline fallback page');
  console.log('[PASS] Service Worker caching strategy, security exclusions, and offline handling verified.');

  // 4. Verify PWA Client Module & Multi-Platform Guide Implementation
  console.log('\n--- 4. Testing Multi-Platform Installation Guide (pwa.js) ---');
  const pwaJsPath = path.join(__dirname, 'assets/js/pwa.js');
  assert(fs.existsSync(pwaJsPath), 'assets/js/pwa.js must exist');
  const pwaJsContent = fs.readFileSync(pwaJsPath, 'utf8');

  // Verify modal elements and buttons
  assert(pwaJsContent.includes('pwaGuideModal'), 'Must create pwaGuideModal');
  assert(pwaJsContent.includes('closePwaGuideModalBtn'), 'Must have closePwaGuideModalBtn');
  assert(pwaJsContent.includes('pwaGuideGotItBtn'), 'Must have pwaGuideGotItBtn');
  assert(pwaJsContent.includes('pwaGuideBackBtn'), 'Must have pwaGuideBackBtn');

  // Verify the three platform options
  assert(pwaJsContent.includes('Desktop Installation'), 'Must have Desktop Installation option');
  assert(pwaJsContent.includes('Android Installation'), 'Must have Android Installation option');
  assert(pwaJsContent.includes('iPhone & iPad Installation'), 'Must have iPhone & iPad Installation option');

  // Verify Desktop installation steps
  assert(pwaJsContent.includes('supported browser'), 'Desktop guide must mention supported browser');
  assert(pwaJsContent.includes('address bar'), 'Desktop guide must mention address bar / menu');
  assert(pwaJsContent.includes('Install app'), 'Desktop guide must mention Install app / HabitFlow');
  assert(pwaJsContent.includes('Start menu') || pwaJsContent.includes('Applications folder'), 'Desktop guide must mention desktop / Start menu / Applications');

  // Verify Android installation steps
  assert(pwaJsContent.includes('Google Chrome'), 'Android guide must mention Google Chrome / browser');
  assert(pwaJsContent.includes('three vertical dots') || pwaJsContent.includes('browser menu'), 'Android guide must mention browser menu');
  assert(pwaJsContent.includes('Add to Home screen'), 'Android guide must mention Add to Home screen / Install app');
  assert(pwaJsContent.includes('home screen or application launcher') || pwaJsContent.includes('app drawer'), 'Android guide must mention opening from launcher');

  // Verify iOS installation steps
  assert(pwaJsContent.includes('Safari'), 'iOS guide must mention Safari');
  assert(pwaJsContent.includes('Share'), 'iOS guide must mention Share button');
  assert(pwaJsContent.includes('Add to Home Screen'), 'iOS guide must mention Add to Home Screen');
  assert(pwaJsContent.includes('Safari\'s Share menu'), 'iOS guide must explain Safari Share menu requirement');

  // Verify event handling methods
  assert(pwaJsContent.includes('closeGuide()'), 'pwa.js must implement closeGuide()');
  assert(pwaJsContent.includes('openGuide('), 'pwa.js must implement openGuide()');
  assert(pwaJsContent.includes('renderGuideView('), 'pwa.js must implement renderGuideView()');
  assert(pwaJsContent.includes('keydown'), 'pwa.js must listen for Escape key');
  assert(pwaJsContent.includes('Escape'), 'pwa.js must close guide on Escape');

  // Verify button types are strictly type="button"
  assert(!pwaJsContent.includes('<button type="submit" id="pwaGuideGotItBtn"'), 'Got It button must NOT be type="submit"');
  assert(pwaJsContent.includes('type="button" class="btn btn-primary" id="pwaGuideGotItBtn"'), 'Got It button must be type="button"');
  assert(pwaJsContent.includes('type="button" class="dev-modal-close" id="closePwaGuideModalBtn"'), 'Close X button must be type="button"');

  console.log('[PASS] Multi-Platform Installation Guide options, steps, back navigation, and controls verified.');

  // 5. Verify CSS Modal System in styles.css
  console.log('\n--- 5. Testing Global CSS Modal System (styles.css) ---');
  const stylesPath = path.join(__dirname, 'assets/css/styles.css');
  const stylesContent = fs.readFileSync(stylesPath, 'utf8');

  assert(stylesContent.includes('.pwa-modal-backdrop'), 'styles.css must style .pwa-modal-backdrop');
  assert(stylesContent.includes('.pwa-modal-backdrop.is-open'), 'styles.css must style .pwa-modal-backdrop.is-open');
  assert(stylesContent.includes('visibility: hidden'), 'styles.css must hide closed modal with visibility: hidden');
  assert(stylesContent.includes('pointer-events: none'), 'styles.css must disable pointer events when closed');
  assert(stylesContent.includes('visibility: visible'), 'styles.css must set visibility: visible when open');
  assert(stylesContent.includes('pointer-events: auto'), 'styles.css must set pointer-events: auto when open');
  assert(stylesContent.includes('.pwa-platform-card'), 'styles.css must style 3 platform cards');
  assert(stylesContent.includes('.pwa-banner-options'), 'styles.css must style prompt bottom platform options');
  console.log('[PASS] Global CSS modal styling, closed-state isolation, and responsive rules verified.');

  // 6. Verify HTML Integration & Form State Safety
  console.log('\n--- 6. Testing HTML Document References & Form State Safety ---');
  const authHtmlPath = path.join(__dirname, 'habitflow_auth.html');
  const authHtml = fs.readFileSync(authHtmlPath, 'utf8');

  assert(authHtml.includes('manifest.webmanifest'), 'habitflow_auth.html must link manifest');
  assert(authHtml.includes('data-open-install-guide'), 'habitflow_auth.html must have install guide trigger');
  assert(authHtml.includes('&copy; HabitFlow'), 'habitflow_auth.html must preserve copyright without year');
  assert(authHtml.includes('id="loginForm"'), 'habitflow_auth.html must retain loginForm');
  assert(authHtml.includes('id="signupForm"'), 'habitflow_auth.html must retain signupForm');

  const dashHtmlPath = path.join(__dirname, 'dashboard.html');
  const dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');
  assert(dashHtml.includes('id="accountPanelInstallBtn"'), 'dashboard.html must have accountPanelInstallBtn');
  assert(dashHtml.includes('id="settingsInstallCard"'), 'dashboard.html must have settingsInstallCard');
  console.log('[PASS] HTML documents verified with intact forms, navigation, and PWA module links.');

  // 7. Test HTTP Server Endpoints
  console.log('\n--- 7. Testing HTTP Server Endpoints & MIME Types ---');
  const httpTests = [
    { url: 'http://localhost:3000/manifest.webmanifest', expectedStatus: 200, contentType: 'application/manifest+json' },
    { url: 'http://localhost:3000/manifest.json', expectedStatus: 200, contentType: 'application/json' },
    { url: 'http://localhost:3000/sw.js', expectedStatus: 200, contentType: 'application/javascript', requiredHeader: { name: 'service-worker-allowed', value: '/' } },
    { url: 'http://localhost:3000/assets/icons/icon-192.png', expectedStatus: 200, contentType: 'image/png' },
    { url: 'http://localhost:3000/assets/icons/icon-512.png', expectedStatus: 200, contentType: 'image/png' },
    { url: 'http://localhost:3000/assets/icons/icon-maskable-192.png', expectedStatus: 200, contentType: 'image/png' },
    { url: 'http://localhost:3000/assets/icons/icon-maskable-512.png', expectedStatus: 200, contentType: 'image/png' },
    { url: 'http://localhost:3000/assets/icons/apple-touch-icon.png', expectedStatus: 200, contentType: 'image/png' },
    { url: 'http://localhost:3000/assets/js/pwa.js', expectedStatus: 200, contentType: 'application/javascript' }
  ];

  for (const t of httpTests) {
    try {
      const res = await fetchEndpoint(t.url);
      assert(res.statusCode === t.expectedStatus, `Endpoint ${t.url} returned status ${res.statusCode}, expected ${t.expectedStatus}`);
      assert(res.headers['content-type'] && res.headers['content-type'].includes(t.contentType), `Endpoint ${t.url} returned content-type "${res.headers['content-type']}", expected "${t.contentType}"`);
      if (t.requiredHeader) {
        assert(res.headers[t.requiredHeader.name] === t.requiredHeader.value, `Endpoint ${t.url} header ${t.requiredHeader.name} returned "${res.headers[t.requiredHeader.name]}", expected "${t.requiredHeader.value}"`);
      }
      console.log(`[PASS] [${res.statusCode} OK] ${t.url} (${res.headers['content-type']})`);
    } catch (err) {
      console.error(`[FAIL] HTTP request to ${t.url} failed:`, err.message);
      process.exit(1);
    }
  }

  // 8. Strict No-Emoji Check Across All Project Files
  console.log('\n--- 8. Strict No-Emoji Verification Across Codebase ---');
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const filesToCheck = [
    'manifest.webmanifest',
    'manifest.json',
    'sw.js',
    'assets/js/pwa.js',
    'dashboard.html',
    'habitflow_auth.html',
    'index.html',
    'reset-password.html',
    'pages/privacy.html',
    'pages/terms.html',
    'assets/css/styles.css',
    'assets/css/auth.css',
    'assets/css/dashboard.css',
    'assets/js/dashboard.js'
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.join(__dirname, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(emojiRegex);
      assert(!match, `File ${relPath} contains prohibited emoji: ${match ? match[0] : ''}`);
    }
  }
  console.log(`[PASS] Zero emojis verified across all ${filesToCheck.length} checked files.`);

  console.log('\n=======================================');
  console.log('ALL PWA & INSTALLATION GUIDE VERIFICATIONS PASSED 100%');
  console.log('=======================================');
}

runPwaVerification();
