/**
 * HabitFlow — Local Development Server
 * Zero-dependency HTTP server with MIME types, clean routing,
 * environment configuration loading, and server-side background reminder processing endpoint.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

// Load environment variables from local .env if present
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
        if (match) {
          let val = (match[2] || '').trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[match[1]]) {
            process.env[match[1]] = val;
          }
        }
      });
    } catch (e) {
      console.warn('[HabitFlow] Could not parse .env file:', e.message);
    }
  }
}
loadEnv();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp'
};

// In-memory registry for server-side background reminders
const scheduledReminders = [];

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Background reminder API endpoint
  if (pathname === '/api/reminders') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (payload.habitId && payload.time) {
            scheduledReminders.push({
              ...payload,
              registeredAt: new Date().toISOString()
            });
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', scheduledCount: scheduledReminders.length }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid payload' }));
        }
      });
      return;
    }
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'active',
        reminders: scheduledReminders,
        serverTime: new Date().toISOString()
      }));
      return;
    }
  }

  // Developer public runtime configuration endpoint (never exposes secret keys)
  if (pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wzeuroydrorelcxprgew.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
    }));
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/habitflow_auth.html';
  }

  const filePath = path.normalize(path.join(ROOT_DIR, pathname));

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <body style="font-family:sans-serif;background:#0b1220;color:#fff;text-align:center;padding:50px">
          <h2>404 — Page Not Found</h2>
          <p><a href="/habitflow_auth.html" style="color:#9be15d">Return to HabitFlow</a></p>
        </body>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const responseHeaders = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    if (pathname === '/sw.js') {
      responseHeaders['Service-Worker-Allowed'] = '/';
    }

    // Dynamic injection of developer public config into HTML and config.js if env vars are present
    const publicUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wzeuroydrorelcxprgew.supabase.co';
    const publicAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

    if (ext === '.html') {
      let html = fs.readFileSync(filePath, 'utf8');
      if (publicAnonKey && !publicAnonKey.includes('your-anon-key')) {
        const injectedConfig = `<script>window.__HABITFLOW_CONFIG__ = Object.assign(window.__HABITFLOW_CONFIG__ || {}, ${JSON.stringify({ supabaseUrl: publicUrl, supabaseAnonKey: publicAnonKey })});</script>`;
        if (html.includes('</head>')) {
          html = html.replace('</head>', `  ${injectedConfig}\n</head>`);
        }
      }
      res.writeHead(200, responseHeaders);
      return res.end(html);
    }

    if (pathname === '/assets/js/config.js') {
      let code = fs.readFileSync(filePath, 'utf8');
      if (publicUrl) {
        code = code.replace(/supabaseUrl:\s*['"][^'"]*['"]/, `supabaseUrl: '${publicUrl}'`);
      }
      if (publicAnonKey && !publicAnonKey.includes('your-anon-key')) {
        code = code.replace(/supabaseAnonKey:\s*['"][^'"]*['"]/, `supabaseAnonKey: '${publicAnonKey}'`);
      }
      res.writeHead(200, responseHeaders);
      return res.end(code);
    }

    res.writeHead(200, responseHeaders);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[HabitFlow] Server running at http://localhost:${PORT}/`);
  console.log(`[HabitFlow] Auth URL: http://localhost:${PORT}/habitflow_auth.html`);
  console.log(`[HabitFlow] Dashboard URL: http://localhost:${PORT}/dashboard.html`);
});
