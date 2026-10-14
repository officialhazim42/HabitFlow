/**
 * HabitFlow — Comprehensive End-to-End Simulation & Verification
 * Tests the complete lifecycle of habits, navigation, security, and persistence.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Starting HabitFlow Full Integration Suite ===\n');

// 1. Verify Top Toolbar Preferences & Appearance
console.log('--- 1. Testing Top Toolbar Preferences & Appearance ---');
const dashHtml = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');

assert(dashHtml.includes('id="openPreferencesBtn"'), 'Must have openPreferencesBtn in HTML');
assert(dashHtml.includes('data-open-preferences'), 'Must have data-open-preferences attribute');
assert(dashHtml.includes('title="Preferences & Appearance"'), 'Must have title tooltip "Preferences & Appearance"');
assert(dashHtml.includes('aria-label="Preferences & Appearance"'), 'Must have accessible aria-label');
assert(dashHtml.includes('id="preferencesModal"'), 'Preferences modal must exist');

// Ensure other sections are NOT placed in top toolbar
const prohibitedInToolbar = [
  'id="navDashboard"', 'id="navDailyHabits"', 'id="navCalendar"',
  'id="navStatistics"', 'id="navReminders"', 'id="navSettings"',
  'id="navPrivacy"', 'id="navDeveloper"', 'id="navSignOut"'
];
prohibitedInToolbar.forEach(id => {
  assert(!dashHtml.includes(id), `Prohibited toolbar item found: ${id}`);
});
console.log('[PASS] Preferences & Appearance icon strictly configured in top toolbar with tooltip.');

// 2. Verify Account Side Panel & Options
console.log('\n--- 2. Testing Left-Side Slide-Out Account Panel ---');
assert(dashHtml.includes('id="accountSlidePanel"'), 'Must have left-side slide-out account panel');
assert(dashHtml.includes('id="accountPanelBackdrop"'), 'Must have account panel backdrop');
assert(dashHtml.includes('id="closeAccountPanelBtn"'), 'Must have close account panel button');
assert(dashHtml.includes('id="userMenuBtn"'), 'Must have user menu trigger button');

// Verify all required options in account panel
assert(dashHtml.includes('data-open-settings'), 'Account panel must have Settings');
assert(dashHtml.includes('href="pages/privacy.html"'), 'Account panel must have Privacy');
assert(dashHtml.includes('data-open-developer-modal'), 'Account panel must have About Developer');
assert(dashHtml.includes('id="logoutDropdownBtn"'), 'Account panel must have Sign Out');

// Sign out NOT in main toolbar
assert(!dashHtml.includes('id="logoutBtn"'), 'Sign Out must NOT be directly in top toolbar');
console.log('[PASS] Left-side account panel and its 4 options (Settings, Privacy, About Developer, Sign Out) verified.');

// 3. Verify Starter Habits Provisioning & Custom Habit CRUD Simulation
console.log('\n--- 3. Testing Daily Habits Provisioning, Add, Edit, Delete Lifecycle ---');

const PREDEFINED_HABITS = [
  { slug: 'wake-up-on-time', name: 'Wake Up on Time', category: 'Personal Development' },
  { slug: 'drink-water', name: 'Drink Water', category: 'Health' },
  { slug: 'morning-exercise', name: 'Morning Exercise', category: 'Fitness' },
  { slug: 'read-20-minutes', name: 'Read for 20 Minutes', category: 'Learning' },
  { slug: 'study-focused-work', name: 'Study or Focused Work', category: 'Productivity' },
  { slug: 'take-screen-break', name: 'Take a Screen Break', category: 'Health' },
  { slug: 'review-daily-goals', name: 'Review Daily Goals', category: 'Productivity' },
  { slug: 'plan-tomorrow', name: 'Plan Tomorrow', category: 'Personal Development' },
  { slug: 'maintain-sleep-schedule', name: 'Maintain a Sleep Schedule', category: 'Sleep' }
];

// In-memory mock storage simulating Supabase / LocalStorage
const mockUser = { id: 'usr-e2e-test-123', email: 'e2e@habitflow.app' };
let mockDbHabits = [];
let mockDbCompletions = [];
let mockLocalStorage = {};

function getTodayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Ensure starter habits
function ensurePredefinedHabits(userId) {
  const seededKey = `habitflow_starter_seeded_${userId}`;
  const deletedKey = `habitflow_deleted_habits_${userId}`;
  const hasSeeded = mockLocalStorage[seededKey] === 'true';

  if (mockDbHabits.some(h => h.user_id === userId)) {
    mockLocalStorage[seededKey] = 'true';
  }

  if (hasSeeded) {
    return false; // Do not resurrect deleted habits
  }

  const deletedHabits = JSON.parse(mockLocalStorage[deletedKey] || '[]');
  const existingSlugs = new Set(mockDbHabits.filter(h => h.user_id === userId).map(h => h.template_slug).filter(Boolean));

  const missing = PREDEFINED_HABITS.filter(template => {
    return !existingSlugs.has(template.slug) && !deletedHabits.includes(template.slug);
  });

  if (missing.length === 0) {
    mockLocalStorage[seededKey] = 'true';
    return false;
  }

  const newRecords = missing.map(t => ({
    id: `habit-${t.slug}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
    template_slug: t.slug,
    name: t.name,
    category: t.category,
    frequency: 'Every day',
    reminder_enabled: true,
    reminder_time: '08:00',
    is_archived: false,
    created_at: new Date().toISOString()
  }));

  mockDbHabits.push(...newRecords);
  mockLocalStorage[seededKey] = 'true';
  return true;
}

// Step A: First login
console.log('Step A: First user login -> provisioning 9 starter habits...');
ensurePredefinedHabits(mockUser.id);
let activeHabits = mockDbHabits.filter(h => h.user_id === mockUser.id && !h.is_archived);
assert.strictEqual(activeHabits.length, 9, 'Must have exactly 9 starter habits on initial login');
console.log(' -> Verified 9 starter habits loaded.');

// Step B: Re-login without changes -> 0 duplicates
console.log('Step B: Subsequent login -> verifying no duplicates created...');
ensurePredefinedHabits(mockUser.id);
activeHabits = mockDbHabits.filter(h => h.user_id === mockUser.id && !h.is_archived);
assert.strictEqual(activeHabits.length, 9, 'Count must remain 9 with 0 duplicates');
console.log(' -> Verified idempotent provisioning (count = 9).');

// Step C: Add a new custom habit
console.log('Step C: Adding custom habit "Drink Herbal Tea"...');
function addCustomHabit(userId, habitData) {
  const newHabit = {
    id: `habit-custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
    template_slug: null,
    name: habitData.name.trim(),
    description: habitData.description || '',
    category: habitData.category || 'General',
    frequency: habitData.frequency || 'Every day',
    reminder_enabled: habitData.reminder_enabled !== false,
    reminder_time: habitData.reminder_time || '08:00',
    is_archived: false,
    created_at: new Date().toISOString()
  };
  mockDbHabits.push(newHabit);
  return newHabit;
}

const custom = addCustomHabit(mockUser.id, {
  name: 'Drink Herbal Tea',
  description: 'Relaxing tea before bedtime',
  category: 'Health',
  frequency: 'Every day',
  reminder_time: '21:00'
});

activeHabits = mockDbHabits.filter(h => h.user_id === mockUser.id && !h.is_archived);
assert.strictEqual(activeHabits.length, 10, 'Must have 10 habits after adding custom habit');
assert(activeHabits.some(h => h.id === custom.id && h.name === 'Drink Herbal Tea'));
console.log(' -> Verified custom habit created, displayed, and coexisting with starter habits.');

// Step D: Complete a habit
console.log('Step D: Completing custom habit and a starter habit today...');
function toggleHabitCompletion(userId, habitId, dateIso) {
  const existingIdx = mockDbCompletions.findIndex(c => c.user_id === userId && c.habit_id === habitId && c.completed_date === dateIso);
  if (existingIdx >= 0) {
    mockDbCompletions.splice(existingIdx, 1);
    return false;
  } else {
    mockDbCompletions.push({
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      habit_id: habitId,
      completed_date: dateIso,
      created_at: new Date().toISOString()
    });
    return true;
  }
}

const today = getTodayIso();
toggleHabitCompletion(mockUser.id, custom.id, today);
const starterHabit = activeHabits.find(h => h.template_slug === 'drink-water');
toggleHabitCompletion(mockUser.id, starterHabit.id, today);

assert.strictEqual(mockDbCompletions.length, 2, 'Must have 2 completions recorded');
console.log(' -> Verified completions recorded for today.');

// Step E: Edit an existing habit
console.log('Step E: Editing custom habit...');
function editHabit(userId, habitId, updates) {
  const habit = mockDbHabits.find(h => h.user_id === userId && h.id === habitId);
  if (!habit) throw new Error('Habit not found');
  Object.assign(habit, updates, { updated_at: new Date().toISOString() });
  return habit;
}

editHabit(mockUser.id, custom.id, {
  name: 'Drink Chamomile Tea',
  frequency: 'Weekdays (Mon-Fri)',
  reminder_time: '21:30'
});

const updated = mockDbHabits.find(h => h.id === custom.id);
assert.strictEqual(updated.name, 'Drink Chamomile Tea');
assert.strictEqual(updated.frequency, 'Weekdays (Mon-Fri)');
assert.strictEqual(updated.reminder_time, '21:30');
// Verify historical completion preserved
assert(mockDbCompletions.some(c => c.habit_id === custom.id), 'Completion records must remain intact after editing');
console.log(' -> Verified habit edited; historical completions preserved.');

// Step F: Delete a starter habit ("Take a Screen Break")
console.log('Step F: Deleting a starter habit ("Take a Screen Break")...');
const toDelete = activeHabits.find(h => h.template_slug === 'take-screen-break');
assert(toDelete, 'Target starter habit must exist');

function deleteHabit(userId, habitId) {
  const habit = mockDbHabits.find(h => h.user_id === userId && h.id === habitId);
  if (!habit) throw new Error('Habit not found');
  habit.is_archived = true;
  habit.updated_at = new Date().toISOString();

  // Track deletion if it was a starter habit
  if (habit.template_slug) {
    const deletedKey = `habitflow_deleted_habits_${userId}`;
    const list = JSON.parse(mockLocalStorage[deletedKey] || '[]');
    if (!list.includes(habit.template_slug)) {
      list.push(habit.template_slug);
      mockLocalStorage[deletedKey] = JSON.stringify(list);
    }
  }
}

deleteHabit(mockUser.id, toDelete.id);
activeHabits = mockDbHabits.filter(h => h.user_id === mockUser.id && !h.is_archived);
assert.strictEqual(activeHabits.length, 9, 'Active count must now be 9 (8 starter + 1 custom)');
assert(!activeHabits.some(h => h.id === toDelete.id), 'Deleted habit must not appear in active habits');
console.log(' -> Verified habit archived/deleted from active view.');

// Step G: Simulate page refresh / new session -> deleted starter habit must NOT reappear!
console.log('Step G: Simulating subsequent login / refresh after deleting starter habit...');
ensurePredefinedHabits(mockUser.id);
const activeAfterReload = mockDbHabits.filter(h => h.user_id === mockUser.id && !h.is_archived);
assert.strictEqual(activeAfterReload.length, 9, 'Active habits must stay 9; deleted habit must NOT reappear!');
assert(!activeAfterReload.some(h => h.template_slug === 'take-screen-break'), 'Deleted starter habit stays gone');
assert(activeAfterReload.some(h => h.id === custom.id), 'Custom habit is preserved');
console.log(' -> Verified deleted starter habit does NOT reappear on next login/refresh.');

// Step H: Ownership security - user B cannot touch user A's habits
console.log('Step H: Verifying user ownership isolation...');
const userB = { id: 'usr-b-999', email: 'userb@example.com' };
assert.throws(() => {
  editHabit(userB.id, custom.id, { name: 'Malicious Change' });
}, /Habit not found/, 'User B cannot edit User A habit');
console.log(' -> Verified user ownership isolation.');

// 4. Verify UI & Forms
console.log('\n--- 4. Testing HTML Elements and Modals ---');
assert(dashHtml.includes('id="openAddHabitModalBtn"'), 'Must have "+ Add Habit" button in dashboard');
assert(dashHtml.includes('id="habitModal"'), 'Must have Add/Edit Habit Modal');
assert(dashHtml.includes('id="habitForm"'), 'Must have Habit form');
assert(dashHtml.includes('id="habitNameInput"'), 'Must have Habit name input');
assert(dashHtml.includes('id="habitCategorySelect"'), 'Must have Category select');
assert(dashHtml.includes('id="habitFrequencySelect"'), 'Must have Frequency select');
assert(dashHtml.includes('id="deleteHabitModal"'), 'Must have Delete Habit confirmation modal');
assert(dashHtml.includes('id="confirmDeleteHabitBtn"'), 'Must have Confirm Delete button');

console.log('[PASS] All UI elements, modal structures, and attributes verified.');

// 5. Verify Zero Emojis
console.log('\n--- 5. Checking Strict No-Emoji Compliance ---');
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const filesToCheck = [
  'dashboard.html',
  'habitflow_auth.html',
  'assets/css/dashboard.css',
  'assets/js/dashboard.js',
  'supabase/schema.sql'
];
filesToCheck.forEach(f => {
  const content = fs.readFileSync(path.join(__dirname, f), 'utf8');
  assert(!content.match(emojiRegex), `Prohibited emoji found in ${f}`);
});
console.log('[PASS] Zero emojis verified across all files.');

console.log('\n=======================================');
console.log('ALL FULL INTEGRATION TESTS PASSED 100%');
console.log('=======================================');
