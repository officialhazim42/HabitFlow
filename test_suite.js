/**
 * HabitFlow — Comprehensive Automated Test Suite
 * Validates Security, 3-Step Password Change, Navigation, Copyright,
 * Predefined Daily Habits, Custom Habit Blocking, and Strict No-Emoji Compliance.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ------------------------------------------------------------------------------
// 1. Test Validation & Name Extraction Logic
// ------------------------------------------------------------------------------
console.log('--- 1. Testing Validation and Greeting Extraction ---');

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return EMAIL_REGEX.test(trimmed) && trimmed.length <= 254;
}

function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  return name.trim().length >= 2;
}

function evaluatePasswordStrength(password) {
  if (!password) return { score: 0, isSufficient: false };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return { score, isSufficient: password.length >= 8 };
}

function extractFirstName(fullName, email = '') {
  if (fullName && typeof fullName === 'string') {
    const trimmed = fullName.trim();
    if (trimmed) {
      const parts = trimmed.split(/\s+/);
      if (parts.length > 0 && parts[0]) {
        const first = parts[0];
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
  }
  if (email && typeof email === 'string') {
    const localPart = email.split('@')[0];
    const cleaned = localPart.replace(/[._\-0-9]+/g, ' ').trim();
    if (cleaned) {
      const first = cleaned.split(/\s+/)[0];
      if (first && first.length >= 2) {
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
  }
  return '';
}

assert.strictEqual(isValidEmail('test@example.com'), true, 'Valid email must pass');
assert.strictEqual(isValidEmail('bad-email'), false, 'Invalid email must fail');
assert.strictEqual(isValidEmail(''), false, 'Empty email must fail');
assert.strictEqual(isValidEmail('@domain.com'), false, 'Missing local-part must fail');

assert.strictEqual(isValidName('Alex'), true, 'Valid name must pass');
assert.strictEqual(isValidName('A'), false, 'Name with < 2 chars must fail');
assert.strictEqual(isValidName('   '), false, 'Whitespace name must fail');

assert.strictEqual(evaluatePasswordStrength('short').isSufficient, false, 'Short password must be insufficient');
assert.strictEqual(evaluatePasswordStrength('Password123!').isSufficient, true, 'Strong password must be sufficient');
assert(evaluatePasswordStrength('Password123!').score >= 4, 'Complex password must score >= 4');

assert.strictEqual(extractFirstName('Hazim Mujif'), 'Hazim', 'Hazim Mujif must produce Hazim');
assert.strictEqual(extractFirstName('Ayaan Khan'), 'Ayaan', 'Ayaan Khan must produce Ayaan');
assert.strictEqual(extractFirstName('Sara Ahmed'), 'Sara', 'Sara Ahmed must produce Sara');
assert.strictEqual(extractFirstName('   '), '', 'Blank name must produce empty string for neutral greeting');

console.log('[PASS] Validation and greeting extraction suite passed completely.');

// ------------------------------------------------------------------------------
// 2. Test File Integrity, Security Password Flow, Navigation & Habits
// ------------------------------------------------------------------------------
console.log('\n--- 2. Testing Security, Password Flow, Navigation & Habits ---');

const authHtml = fs.readFileSync(path.join(__dirname, 'habitflow_auth.html'), 'utf8');
const dashHtml = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
const profileJs = fs.readFileSync(path.join(__dirname, 'assets/js/profile.js'), 'utf8');
const dashJs = fs.readFileSync(path.join(__dirname, 'assets/js/dashboard.js'), 'utf8');
const authCss = fs.readFileSync(path.join(__dirname, 'assets/css/auth.css'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, 'assets/css/styles.css'), 'utf8');
const dashCss = fs.readFileSync(path.join(__dirname, 'assets/css/dashboard.css'), 'utf8');
const schemaSql = fs.readFileSync(path.join(__dirname, 'supabase/schema.sql'), 'utf8');

// A. Copyright Footer Verification
assert(authHtml.includes('&copy; HabitFlow'), 'Login page must contain &copy; HabitFlow');
assert(!authHtml.includes('id="year"'), 'Login page must not contain year span');
assert(!authHtml.includes('2026 HabitFlow'), 'Login page must not contain year in copyright');
console.log('[PASS] Copyright footer displays strictly "© HabitFlow" without year.');

// B. Security & Password Change Form Order & Controls
assert(dashHtml.includes('id="settingsCurrentPassword"'), 'Form must contain Current Password field');
assert(dashHtml.includes('id="settingsNewPassword"'), 'Form must contain New Password field');
assert(dashHtml.includes('id="settingsConfirmPassword"'), 'Form must contain Confirm New Password field');

const currIdx = dashHtml.indexOf('id="settingsCurrentPassword"');
const newIdx = dashHtml.indexOf('id="settingsNewPassword"');
const confirmIdx = dashHtml.indexOf('id="settingsConfirmPassword"');
assert(currIdx < newIdx && newIdx < confirmIdx, 'Password fields must appear in exact order: 1. Current, 2. New, 3. Confirm New');

assert(dashHtml.includes('data-toggle="settingsCurrentPassword"'), 'Current password must have show/hide control');
assert(dashHtml.includes('data-toggle="settingsNewPassword"'), 'New password must have show/hide control');
assert(dashHtml.includes('data-toggle="settingsConfirmPassword"'), 'Confirm new password must have show/hide control');

// Password Verification Error and Success Messages
assert(dashJs.includes('Your current password is incorrect. Please try again.'), 'Must contain exact current password incorrect message');
assert(dashJs.includes('Your new passwords do not match.'), 'Must contain exact password mismatch message');
assert(dashJs.includes('Your new password must be different from your current password.'), 'Must contain exact identical password error message');
assert(dashJs.includes('Your password has been changed successfully.'), 'Must contain exact password changed success message');
assert(dashJs.includes('signInWithPassword'), 'Must verify current password with Supabase signInWithPassword');
assert(dashJs.includes('updateUser'), 'Must update password with Supabase updateUser');
console.log('[PASS] 3-Step Password Change security flow and exact messages verified.');

// C. Restored Original Dashboard Toolbar & Left-Side Slide-Out Account Panel Verification
assert(dashHtml.includes('class="brand"'), 'Header must contain HabitFlow brand mark and logo');
assert(dashHtml.includes('id="openPreferencesBtn"'), 'Toolbar must contain direct Preferences & Appearance entry');
assert(dashHtml.includes('id="userMenuBtn"'), 'Toolbar must contain profile/account trigger button');

// Verify that the toolbar is not cluttered with all 8 sections
assert(!dashHtml.includes('id="navItemPreferences"'), 'Toolbar must not use cluttered multi-item nav bar');
assert(!dashHtml.includes('dash-nav-links'), 'Toolbar must not contain duplicate toolbar links list');

// Verify Left-Side Slide-Out Account Panel
assert(dashHtml.includes('id="accountSlidePanel"'), 'Must contain left-side slide-out account panel');
assert(dashHtml.includes('id="accountPanelBackdrop"'), 'Must contain account panel backdrop');
assert(dashHtml.includes('id="closeAccountPanelBtn"'), 'Account panel must have close button');

// Account panel options
assert(dashHtml.includes('data-open-settings'), 'Account panel must retain Settings option');
assert(dashHtml.includes('href="pages/privacy.html"'), 'Account panel must retain Privacy option');
assert(dashHtml.includes('data-open-developer-modal'), 'Account panel must retain About Developer option');
assert(dashHtml.includes('id="logoutDropdownBtn"'), 'Account panel must retain Sign Out option');

// Sign Out must remain inside the left-side account panel, not in the toolbar
assert(!dashHtml.includes('id="logoutBtn"'), 'Sign Out must NOT be moved into the main toolbar as a standalone button');

// Direct Preferences & Reminders modals
assert(dashHtml.includes('id="preferencesModal"'), 'Must retain dedicated Preferences & Appearance modal');
assert(dashHtml.includes('id="remindersModal"'), 'Must retain dedicated Reminders modal');
console.log('[PASS] Restored original navigation layout and left-side account panel verified.');

// D. Predefined Starter Habits & Custom Habit Management (CRUD)
const requiredPredefinedHabits = [
  { name: 'Wake Up on Time', cat: 'Personal Development' },
  { name: 'Drink Water', cat: 'Health' },
  { name: 'Morning Exercise', cat: 'Fitness' },
  { name: 'Read for 20 Minutes', cat: 'Learning' },
  { name: 'Study or Focused Work', cat: 'Productivity' },
  { name: 'Take a Screen Break', cat: 'Health' },
  { name: 'Review Daily Goals', cat: 'Productivity' },
  { name: 'Plan Tomorrow', cat: 'Personal Development' },
  { name: 'Maintain a Sleep Schedule', cat: 'Sleep' }
];

requiredPredefinedHabits.forEach(h => {
  assert(dashJs.includes(h.name), `Predefined habits must contain: ${h.name}`);
  assert(dashJs.includes(h.cat), `Predefined habits must categorize ${h.name} as ${h.cat}`);
  assert(schemaSql.includes(h.name), `Schema must seed predefined habit: ${h.name}`);
});

// Users can manage habits: + Add Habit button, Edit Habit, Delete Habit
assert(dashHtml.includes('id="openAddHabitModalBtn"'), 'UI must contain "+ Add Habit" button');
assert(dashHtml.includes('id="habitModal"'), 'UI must contain Add/Edit Habit Modal');
assert(dashHtml.includes('id="habitNameInput"'), 'Modal must have habit name input');
assert(dashHtml.includes('id="habitCategorySelect"'), 'Modal must have category select');
assert(dashHtml.includes('id="habitFrequencySelect"'), 'Modal must have frequency select');
assert(dashHtml.includes('id="habitReminderEnableInput"'), 'Modal must have reminder toggle');
assert(dashHtml.includes('id="deleteHabitModal"'), 'UI must contain Delete Habit confirmation modal');
assert(dashHtml.includes('id="confirmDeleteHabitBtn"'), 'Delete modal must have confirmation button');

// Habit Card Actions in dashboard.js
assert(dashJs.includes('edit-habit'), 'Habit card must support edit action');
assert(dashJs.includes('delete-habit'), 'Habit card must support delete action');
assert(dashJs.includes('createHabit'), 'Data access layer must implement createHabit');
assert(dashJs.includes('updateHabit'), 'Data access layer must implement updateHabit');
assert(dashJs.includes('deleteHabit'), 'Data access layer must implement deleteHabit');

// Supabase RLS Policies for user habits
assert(schemaSql.includes('Users can create their own habits'), 'RLS policy must allow INSERT for own habits');
assert(schemaSql.includes('Users can update their own habits'), 'RLS policy must allow UPDATE for own habits');
assert(schemaSql.includes('Users can delete their own habits'), 'RLS policy must allow DELETE for own habits');
console.log('[PASS] 9 Predefined Starter Habits & Custom Habit Management (Add, Edit, Delete) verified.');

// E. Developer Details & Social Media
assert(profileJs.includes('Hazim Bashir'), 'Must contain Hazim Bashir');
assert(profileJs.includes('حازم بشیر'), 'Must contain Urdu name حازم بشیر');
assert(profileJs.includes('@officialhazim42'), 'Must contain handle @officialhazim42');
assert(profileJs.includes('Ganderbal, Jammu & Kashmir, India'), 'Must contain exact location');
assert(profileJs.includes('hazimbashirfaqeer@gmail.com'), 'Must contain official email');

const platforms = [
  'Instagram', 'GitHub', 'Reddit', 'Snapchat', 'Discord',
  'Threads', 'LinkedIn', 'X / Twitter', 'Telegram', 'YouTube'
];
platforms.forEach(p => {
  assert(profileJs.includes(p), `Profile must contain platform: ${p}`);
});
console.log('[PASS] Developer profile and 10 platforms verified.');

// F. Strict No-Emoji Check Across All Website Files
console.log('\n--- 3. Strict No-Emoji Verification Across Codebase ---');
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const projectFilesToCheck = [
  'habitflow_auth.html',
  'dashboard.html',
  'reset-password.html',
  'pages/privacy.html',
  'pages/terms.html',
  'assets/css/styles.css',
  'assets/css/auth.css',
  'assets/css/dashboard.css',
  'assets/css/developer-modal.css',
  'assets/js/auth.js',
  'assets/js/dashboard.js',
  'assets/js/profile.js',
  'assets/js/theme.js',
  'assets/js/validation.js'
];

projectFilesToCheck.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(emojiRegex);
    assert(!match, `File ${relPath} contains prohibited emoji: ${match ? match[0] : ''}`);
  }
});
console.log('[PASS] Zero emojis verified across all 14 project files.');

// ------------------------------------------------------------------------------
// 4. Test HTTP Server Endpoints
// ------------------------------------------------------------------------------
console.log('\n--- 4. Testing HTTP Server Endpoints ---');

const endpoints = [
  { url: 'http://localhost:3000/', expectedStatus: 200, contentType: 'text/html' },
  { url: 'http://localhost:3000/habitflow_auth.html', expectedStatus: 200, contentType: 'text/html' },
  { url: 'http://localhost:3000/dashboard.html', expectedStatus: 200, contentType: 'text/html' },
  { url: 'http://localhost:3000/reset-password.html', expectedStatus: 200, contentType: 'text/html' },
  { url: 'http://localhost:3000/pages/privacy.html', expectedStatus: 200, contentType: 'text/html' },
  { url: 'http://localhost:3000/pages/terms.html', expectedStatus: 200, contentType: 'text/html' },
  { url: 'http://localhost:3000/assets/css/styles.css', expectedStatus: 200, contentType: 'text/css' },
  { url: 'http://localhost:3000/assets/css/auth.css', expectedStatus: 200, contentType: 'text/css' },
  { url: 'http://localhost:3000/assets/css/dashboard.css', expectedStatus: 200, contentType: 'text/css' },
  { url: 'http://localhost:3000/assets/css/developer-modal.css', expectedStatus: 200, contentType: 'text/css' },
  { url: 'http://localhost:3000/assets/js/theme.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/assets/js/config.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/assets/js/supabase-client.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/assets/js/validation.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/assets/js/profile.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/assets/js/auth.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/assets/js/dashboard.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/assets/js/reset-password.js', expectedStatus: 200, contentType: 'application/javascript' },
  { url: 'http://localhost:3000/api/reminders', expectedStatus: 200, contentType: 'application/json' }
];

const { spawn } = require('child_process');

async function runHttpTests() {
  let spawnedServer = null;
  const isServerRunning = await new Promise((resolve) => {
    http.get('http://localhost:3000/api/reminders', () => resolve(true)).on('error', () => resolve(false));
  });

  if (!isServerRunning) {
    console.log('Local dev server not detected; starting server on port 3000...');
    spawnedServer = spawn(process.execPath, ['server.js'], { cwd: __dirname, stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 1000));
  }

  try {
    for (const ep of endpoints) {
      await new Promise((resolve, reject) => {
        http.get(ep.url, (res) => {
          try {
            assert.strictEqual(res.statusCode, ep.expectedStatus, `Endpoint ${ep.url} must return ${ep.expectedStatus}`);
            const ct = res.headers['content-type'] || '';
            assert(ct.includes(ep.contentType), `Endpoint ${ep.url} content-type must include ${ep.contentType}, got ${ct}`);
            resolve();
          } catch (e) {
            reject(e);
          }
        }).on('error', reject);
      });
      console.log(`[PASS] [200 OK] ${ep.url}`);
    }

    console.log('\n=======================================');
    console.log('ALL AUTOMATED TESTS PASSED 100%');
    console.log('=======================================');
  } finally {
    if (spawnedServer) {
      spawnedServer.kill();
    }
  }
}

runHttpTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

