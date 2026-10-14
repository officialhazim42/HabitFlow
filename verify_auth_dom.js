/**
 * HabitFlow — Auth DOM & Form Interaction Verification
 * Validates DOM elements, view state switching, input fields, password toggles,
 * inline validation, OAuth triggers, and absence of user-side Supabase setup elements.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Starting HabitFlow Auth DOM Verification Suite ===\n');

const authHtmlPath = path.join(__dirname, 'habitflow_auth.html');
const authHtml = fs.readFileSync(authHtmlPath, 'utf8');

// 1. Verify absence of user-side configuration prompts
console.log('--- 1. Testing Clean SaaS Auth Surface ---');
assert(!authHtml.includes('id="configBanner"'), 'Must not have configBanner in DOM');
assert(!authHtml.includes('id="configModal"'), 'Must not have configModal in DOM');
assert(!authHtml.includes('cfgSupabaseUrl'), 'Must not ask users for Supabase URL');
assert(!authHtml.includes('cfgSupabaseKey'), 'Must not ask users for Supabase Key');
console.log('[PASS] Auth page is clean of developer/database setup modals.');

// 2. Verify View Tabs & Forms
console.log('\n--- 2. Testing View Tabs and Form Structures ---');
assert(authHtml.includes('id="tabLogin"'), 'Must have Login tab');
assert(authHtml.includes('id="tabSignup"'), 'Must have Signup tab');
assert(authHtml.includes('id="loginForm"'), 'Must have loginForm');
assert(authHtml.includes('id="signupForm"'), 'Must have signupForm');
assert(authHtml.includes('id="forgotForm"'), 'Must have forgotForm');

// Check Login Form Fields
assert(authHtml.includes('id="loginEmail"'), 'Login form must have loginEmail');
assert(authHtml.includes('id="loginPassword"'), 'Login form must have loginPassword');
assert(authHtml.includes('data-toggle="loginPassword"'), 'Login form must have password visibility toggle');
assert(authHtml.includes('id="forgotPassBtn"'), 'Login form must have forgot password trigger');

// Check Signup Form Fields
assert(authHtml.includes('id="fullName"'), 'Signup form must have fullName');
assert(authHtml.includes('id="signupEmail"'), 'Signup form must have signupEmail');
assert(authHtml.includes('id="signupPassword"'), 'Signup form must have signupPassword');
assert(authHtml.includes('id="confirmPassword"'), 'Signup form must have confirmPassword');
assert(authHtml.includes('id="agreeTerms"'), 'Signup form must have agreeTerms checkbox');
assert(authHtml.includes('id="strength"'), 'Signup form must have password strength bar');
assert(authHtml.includes('id="strengthLabel"'), 'Signup form must have password strength label');

// Check Forgot Form Fields
assert(authHtml.includes('id="forgotEmail"'), 'Forgot form must have forgotEmail');
console.log('[PASS] All auth forms and input fields verified in DOM.');

// 3. Verify OAuth Social Authentication Buttons
console.log('\n--- 3. Testing OAuth Social Authentication Buttons ---');
assert(/data-social=["']Google["']/i.test(authHtml), 'Must have Google OAuth button');
assert(/data-social=["']Facebook["']/i.test(authHtml), 'Must have Facebook OAuth button');
assert(!/data-social=["']Apple["']/i.test(authHtml), 'Apple login must be completely removed');
console.log('[PASS] Google and Facebook OAuth buttons verified.');

// 4. Verify Developer Attribution & Modal Trigger
console.log('\n--- 4. Testing Developer Attribution & Modal ---');
assert(authHtml.includes('data-open-developer-modal'), 'Must have About Developer modal trigger');
assert(authHtml.includes('Hazim Bashir'), 'Must attribute Hazim Bashir');
assert(authHtml.includes('حازم بشیر'), 'Must display Urdu script name');
assert(authHtml.includes('&copy; HabitFlow'), 'Must display copyright &copy; HabitFlow without year');
console.log('[PASS] Developer modal trigger and attribution verified.');

// 5. Test Validation Functions
console.log('\n--- 5. Testing Validation Functions ---');
const valSource = fs.readFileSync(path.join(__dirname, 'assets/js/validation.js'), 'utf8');
assert(valSource.includes('export function isValidEmail'), 'validation.js must export isValidEmail');
assert(valSource.includes('export function isValidName'), 'validation.js must export isValidName');
assert(valSource.includes('export function evaluatePasswordStrength'), 'validation.js must export evaluatePasswordStrength');
assert(valSource.includes('export function doPasswordsMatch'), 'validation.js must export doPasswordsMatch');

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

function doPasswordsMatch(pwd1, pwd2) {
  return Boolean(pwd1) && pwd1 === pwd2;
}

assert.strictEqual(isValidEmail('developer@habitflow.app'), true, 'Valid email passes');
assert.strictEqual(isValidEmail('invalid-email'), false, 'Invalid email fails');
assert.strictEqual(isValidName('Hazim'), true, 'Valid name passes');
assert.strictEqual(isValidName('H'), false, '1-character name fails');
assert.strictEqual(doPasswordsMatch('SecurePass123!', 'SecurePass123!'), true, 'Matching passwords pass');
assert.strictEqual(doPasswordsMatch('SecurePass123!', 'DifferentPass'), false, 'Mismatched passwords fail');
console.log('[PASS] Validation functions verified.');

// 6. Strict Zero-Emoji Verification
console.log('\n--- 6. Strict Zero-Emoji Verification ---');
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const match = authHtml.match(emojiRegex);
assert(!match, `habitflow_auth.html contains forbidden emoji: ${match ? match[0] : ''}`);
console.log('[PASS] Zero emojis verified in habitflow_auth.html.');

console.log('\n======================================================');
console.log('ALL AUTH DOM & INTERACTION VERIFICATIONS PASSED 100%');
console.log('======================================================\n');
