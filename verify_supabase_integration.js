/**
 * HabitFlow — Supabase Developer-Configured Integration Verification
 * Validates:
 * 1. Single Developer-configured Supabase project URL (https://wzeuroydrorelcxprgew.supabase.co).
 * 2. Complete absence of end-user Supabase connection screens, banners, or inputs.
 * 3. Security: Zero exposure of service-role keys or secret tokens.
 * 4. Git safety: .env files ignored by .gitignore.
 * 5. Row Level Security: Policies defined for profiles, habits, habit_completions, daily_reflections.
 * 6. Server configuration: Public /api/config endpoint and environment loading.
 * 7. Zero-Emoji Compliance across all modified files.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Starting Supabase Integration & Security Verification ===\n');

// 1. Verify config.js default project URL
console.log('--- 1. Testing Developer Supabase Project Configuration ---');
const configJsPath = path.join(__dirname, 'assets/js/config.js');
const configJs = fs.readFileSync(configJsPath, 'utf8');

assert(configJs.includes('https://wzeuroydrorelcxprgew.supabase.co'), 'config.js must contain configured Supabase project URL');
assert(!configJs.includes('saveCredentials('), 'config.js must not expose user-facing saveCredentials helper');
assert(!configJs.includes('clearCredentials('), 'config.js must not expose user-facing clearCredentials helper');
console.log('[PASS] Developer-configured Supabase URL verified in assets/js/config.js.');

// 2. Verify complete removal of user-facing connection modal & banner from habitflow_auth.html
console.log('\n--- 2. Testing Absence of End-User Connection Setup UI ---');
const authHtmlPath = path.join(__dirname, 'habitflow_auth.html');
const authHtml = fs.readFileSync(authHtmlPath, 'utf8');

assert(!authHtml.includes('id="configBanner"'), 'habitflow_auth.html must NOT contain configBanner');
assert(!authHtml.includes('id="configModal"'), 'habitflow_auth.html must NOT contain configModal');
assert(!authHtml.includes('id="openConfigModalBtn"'), 'habitflow_auth.html must NOT contain openConfigModalBtn');
assert(!authHtml.includes('id="cfgSupabaseUrl"'), 'habitflow_auth.html must NOT contain cfgSupabaseUrl input');
assert(!authHtml.includes('id="cfgSupabaseKey"'), 'habitflow_auth.html must NOT contain cfgSupabaseKey input');
assert(!authHtml.includes('Connect Supabase'), 'habitflow_auth.html must NOT contain user-facing "Connect Supabase" button');
console.log('[PASS] Zero end-user Supabase connection screens or banners found in habitflow_auth.html.');

// 3. Verify auth.js clean SaaS error handling
console.log('\n--- 3. Testing auth.js SaaS Handlers & Isolation ---');
const authJsPath = path.join(__dirname, 'assets/js/auth.js');
const authJs = fs.readFileSync(authJsPath, 'utf8');

assert(!authJs.includes('openConfigModalBtn'), 'auth.js must NOT reference openConfigModalBtn');
assert(!authJs.includes('configModal.classList.add'), 'auth.js must NOT open configModal');
assert(!authJs.includes('Click "Connect Supabase"'), 'auth.js must NOT instruct users to connect Supabase');
assert(authJs.includes('Authentication service is currently unavailable'), 'auth.js must provide friendly SaaS unavailability message');
assert(authJs.includes('signInWithGoogle'), 'auth.js must retain Google OAuth');
assert(authJs.includes('signInWithFacebook'), 'auth.js must retain Facebook OAuth');
console.log('[PASS] auth.js cleanly isolates users from backend configuration.');

// 4. Verify .env.example and .gitignore security
console.log('\n--- 4. Testing Environment Variables & Git Isolation ---');
const envExamplePath = path.join(__dirname, '.env.example');
const envExample = fs.readFileSync(envExamplePath, 'utf8');

assert(envExample.includes('https://wzeuroydrorelcxprgew.supabase.co'), '.env.example must have project URL');
assert(envExample.includes('SUPABASE_ANON_KEY='), '.env.example must specify SUPABASE_ANON_KEY');
assert(envExample.includes('NEVER expose your SUPABASE_SERVICE_ROLE_KEY'), '.env.example must warn against exposing service role key');

const gitignorePath = path.join(__dirname, '.gitignore');
const gitignore = fs.readFileSync(gitignorePath, 'utf8');
assert(gitignore.includes('.env'), '.gitignore must ignore .env');
assert(gitignore.includes('*service_role*') || gitignore.includes('*service-role*'), '.gitignore must ignore service role files');
console.log('[PASS] Environment configuration example and .gitignore protection verified.');

// 5. Verify Row Level Security (RLS) in schema.sql
console.log('\n--- 5. Testing Row Level Security (RLS) Policies ---');
const schemaSqlPath = path.join(__dirname, 'supabase/schema.sql');
const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');

const requiredRlsTables = ['profiles', 'habits', 'habit_completions', 'daily_reflections'];
requiredRlsTables.forEach(table => {
  assert(
    schemaSql.includes(`alter table public.${table} enable row level security;`),
    `Table public.${table} must have RLS enabled`
  );
});

// Check user isolation policies
assert(schemaSql.includes('auth.uid() = id'), 'Profiles must restrict access to auth.uid() = id');
assert(schemaSql.includes('auth.uid() = user_id'), 'User records must restrict access to auth.uid() = user_id');
console.log('[PASS] Row Level Security verified across all user tables.');

// 6. Verify Server /api/config endpoint
console.log('\n--- 6. Testing server.js Runtime Config & Security ---');
const serverJsPath = path.join(__dirname, 'server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

assert(serverJs.includes('/api/config'), 'server.js must provide /api/config endpoint');
assert(!serverJs.includes('service_role'), 'server.js must NEVER expose service_role');
assert(!serverJs.includes('sb_secret_'), 'server.js must NEVER expose sb_secret_');
console.log('[PASS] server.js safe config endpoint and security verified.');

// 7. Strict No-Emoji Check
console.log('\n--- 7. Strict Zero-Emoji Verification ---');
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const filesToCheck = [
  'habitflow_auth.html',
  'assets/js/auth.js',
  'assets/js/config.js',
  'server.js',
  'build.js',
  '.env.example'
];

filesToCheck.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const match = content.match(emojiRegex);
  assert(!match, `File ${file} contains forbidden emoji: ${match ? match[0] : ''}`);
});
console.log('[PASS] Zero emojis verified across all modified files.');

console.log('\n======================================================');
console.log('ALL SUPABASE INTEGRATION & SECURITY VERIFICATIONS PASSED');
console.log('======================================================\n');
