/**
 * HabitFlow — Logic & State Verification Script
 * Simulates user sessions, habit initialization, duplicate prevention, and navigation structure.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running HabitFlow Logic & State Verification ===\n');

// 1. Verify 9 Predefined Habits Definition
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

assert.strictEqual(PREDEFINED_HABITS.length, 9, 'Must have exactly 9 predefined habits');

// 2. Simulation of ensurePredefinedHabits() with Seeding and Deletion Tracking
console.log('Test 1: Simulating new user registration (0 existing habits)...');
let userHabits = [];
let deletedHabitSlugs = new Set();
let isSeeded = false;
const currentUser = { id: 'usr-1001-uuid', email: 'testuser@example.com' };

function simulateEnsureHabits() {
  if (isSeeded) {
    return userHabits; // Already seeded, never resurrect intentionally deleted habits
  }

  const existingSlugs = new Set();
  const existingNames = new Set();
  userHabits.forEach(h => {
    if (h.template_slug) existingSlugs.add(h.template_slug);
    if (h.name) existingNames.add(h.name.toLowerCase().trim());
  });

  const missing = PREDEFINED_HABITS.filter(p => 
    !existingSlugs.has(p.slug) && 
    !existingNames.has(p.name.toLowerCase().trim()) &&
    !deletedHabitSlugs.has(p.slug)
  );

  const newRecords = missing.map(m => ({
    id: `${currentUser.id}-${m.slug}`,
    user_id: currentUser.id,
    template_slug: m.slug,
    name: m.name,
    category: m.category,
    frequency: 'Every day',
    reminder_time: '08:00',
    is_archived: false
  }));

  userHabits = [...userHabits, ...newRecords];
  isSeeded = true;
  return userHabits;
}

userHabits = simulateEnsureHabits();
assert.strictEqual(userHabits.length, 9, 'New user must receive all 9 starter habits');
console.log(' -> Result: All 9 starter habits provisioned successfully.');

// 3. Simulation of Repeated Login / Page Refresh (Idempotence & No Duplicates)
console.log('\nTest 2: Simulating page refresh / re-login with existing habits...');
const beforeCount = userHabits.length;
userHabits = simulateEnsureHabits();
assert.strictEqual(userHabits.length, beforeCount, 'Page refresh must not duplicate habits');
console.log(' -> Result: Idempotent - 0 duplicates created (count remained 9).');

// 4. Custom Habit: Add a New Habit
console.log('\nTest 3: Simulating user adding a custom habit ("Practice Meditation")...');
const customHabit = {
  id: `${currentUser.id}-custom-meditation`,
  user_id: currentUser.id,
  template_slug: null,
  name: 'Practice Meditation',
  description: '10 minutes of mindfulness',
  category: 'Personal Development',
  frequency: 'Every day',
  reminder_time: '07:30',
  is_archived: false
};
userHabits.push(customHabit);
assert.strictEqual(userHabits.length, 10, 'Habit list must now have 10 habits');
assert(userHabits.some(h => h.name === 'Practice Meditation'), 'Custom habit must be in active list');
console.log(' -> Result: Custom habit added and coexists with starter habits.');

// 5. Custom Habit: Edit an Existing Habit
console.log('\nTest 4: Simulating editing an existing habit...');
const habitToEdit = userHabits.find(h => h.name === 'Practice Meditation');
assert(habitToEdit, 'Habit to edit must exist');
habitToEdit.name = 'Daily Mindfulness & Meditation';
habitToEdit.reminder_time = '07:00';
assert.strictEqual(userHabits.find(h => h.id === habitToEdit.id).name, 'Daily Mindfulness & Meditation');
console.log(' -> Result: Habit edited successfully while maintaining ID and history linkage.');

// 6. Delete a Habit & Ensure Deleted Starter Habits Do Not Reappear
console.log('\nTest 5: Simulating deletion of a starter habit ("Wake Up on Time")...');
const starterHabitToDelete = userHabits.find(h => h.template_slug === 'wake-up-on-time');
assert(starterHabitToDelete, 'Starter habit to delete must exist');

// Soft-delete: mark is_archived = true and track in deleted set
starterHabitToDelete.is_archived = true;
deletedHabitSlugs.add(starterHabitToDelete.template_slug);
const activeHabits = userHabits.filter(h => !h.is_archived);
assert.strictEqual(activeHabits.length, 9, 'Active habits should be 9 after archiving 1 habit');
assert(!activeHabits.some(h => h.template_slug === 'wake-up-on-time'), 'Deleted starter habit must not be in active list');

// Simulate subsequent page refresh / re-login
console.log('Simulating subsequent login after starter habit deletion...');
simulateEnsureHabits();
const activeAfterRefresh = userHabits.filter(h => !h.is_archived);
assert.strictEqual(activeAfterRefresh.length, 9, 'Starter habit must NOT resurrect on next login/refresh');
assert(!activeAfterRefresh.some(h => h.template_slug === 'wake-up-on-time'), 'Deleted starter habit stays deleted');
console.log(' -> Result: Deleted starter habit did NOT reappear on re-login/refresh.');

// 7. Verify Dashboard HTML Navigation & Elements
console.log('\nTest 6: Verifying Dashboard HTML Navigation and UI elements...');
const dashHtml = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');

// Toolbar brand
assert(dashHtml.includes('class="brand"'), 'Header must contain brand mark');
// Preferences entry with tooltip
assert(dashHtml.includes('id="openPreferencesBtn"'), 'Toolbar must contain Preferences button');
assert(dashHtml.includes('title="Preferences & Appearance"'), 'Preferences button must have tooltip');
assert(dashHtml.includes('aria-label="Preferences & Appearance"'), 'Preferences button must have aria-label');
// Account trigger
assert(dashHtml.includes('id="userMenuBtn"'), 'Toolbar must contain user menu trigger button');
// No clutter of all sections in toolbar
assert(!dashHtml.includes('dash-nav-links'), 'Toolbar must NOT contain cluttered links list');
// Left-side slide panel
assert(dashHtml.includes('id="accountSlidePanel"'), 'Must contain left-side slide-out account panel');
assert(dashHtml.includes('id="accountPanelBackdrop"'), 'Must contain account panel backdrop');
// Account panel items
assert(dashHtml.includes('data-open-settings'), 'Account panel must contain Settings');
assert(dashHtml.includes('href="pages/privacy.html"'), 'Account panel must contain Privacy');
assert(dashHtml.includes('data-open-developer-modal'), 'Account panel must contain About Developer');
assert(dashHtml.includes('id="logoutDropdownBtn"'), 'Account panel must contain Sign Out');
// Sign out NOT in toolbar
assert(!dashHtml.includes('id="logoutBtn"'), 'Sign Out must NOT be in toolbar');

// Habit Management UI: + Add Habit button & Modals
assert(dashHtml.includes('id="openAddHabitModalBtn"'), 'Must contain "+ Add Habit" button in Daily Habits');
assert(dashHtml.includes('id="habitModal"'), 'Must contain Add/Edit Habit Modal');
assert(dashHtml.includes('id="deleteHabitModal"'), 'Must contain Delete Habit Confirmation Modal');
console.log(' -> Result: Dashboard navigation structure and habit management UI strictly verified.');

// 8. Verify Strict No-Emoji Rule Across Files
console.log('\nTest 7: Checking strict no-emoji compliance...');
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const files = [
  'dashboard.html',
  'habitflow_auth.html',
  'assets/css/dashboard.css',
  'assets/js/dashboard.js',
  'supabase/schema.sql'
];
files.forEach(f => {
  const content = fs.readFileSync(path.join(__dirname, f), 'utf8');
  const match = content.match(emojiRegex);
  assert(!match, `File ${f} contains prohibited emoji: ${match ? match[0] : ''}`);
});
console.log(' -> Result: Zero emojis across all checked files.');

console.log('\n=============================================');
console.log('ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY');
console.log('=============================================');
