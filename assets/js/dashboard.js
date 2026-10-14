/**
 * HabitFlow — User Dashboard Controller
 * Professional SaaS Specification (Strict No-Emoji Design)
 * Handles Predefined Daily Habits, Schedule-Aware Streaks, Advanced Analytics,
 * Calendar Tracking, Daily Reflections, Data Export, 3-Step Password Security Verification,
 * Direct Main Navigation Preferences & Appearance, Reminders, and Daily Check-ins.
 */

import { CONFIG } from './config.js';
import { getSupabase, formatAuthError } from './supabase-client.js';
import { openDeveloperModal, showToast } from './profile.js';
import { getStoredTheme, getStoredAccent, setTheme, setAccent, ACCENTS } from './theme.js';

let currentUser = null;
let currentProfile = null;
let userHabits = [];
let habitCompletions = [];
let dailyReflections = [];
let activeCategory = 'All';
let activeStatusFilter = 'all'; // 'all' | 'pending' | 'completed'
let habitSearchQuery = '';
let habitSortOrder = 'default';
let currentHabitView = 'active'; // 'active' | 'archived'
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let selectedCalDate = getTodayIso();
let reminderIntervalId = null;
const remindedTodaySet = new Set();

// Lucide-style Clean Icon SVGs (Strict No-Emoji Rule)
const ICONS = {
  check: `<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  flame: `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  bell: `<svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  calendarPlus: `<svg class="icon icon-xl" viewBox="0 0 24 24"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M10 16h4"/><path d="M12 14v4"/></svg>`,
  loader: `<svg class="icon icon-xl" viewBox="0 0 24 24"><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/></svg>`,
  clock: `<svg class="icon icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  eye: `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
  edit: `<svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  archive: `<svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect width="22" height="5" x="1" y="3" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  rotateCcw: `<svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  target: `<svg class="icon icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
};

/**
 * 9 Predefined Daily Habits for Every User
 * Standard recommended daily routines with stable slugs
 */
export const PREDEFINED_HABITS = [
  {
    slug: 'wake-up-on-time',
    name: 'Wake Up on Time',
    description: 'Start the day according to your planned schedule.',
    category: 'Personal Development',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '07:00',
    reminder_enabled: true,
    sort_order: 1
  },
  {
    slug: 'drink-water',
    name: 'Drink Water',
    description: 'Maintain regular water intake throughout the day.',
    category: 'Health',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '08:00',
    reminder_enabled: true,
    sort_order: 2
  },
  {
    slug: 'morning-exercise',
    name: 'Morning Exercise',
    description: 'Complete a short workout, stretching session, or walk.',
    category: 'Fitness',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '09:00',
    reminder_enabled: true,
    sort_order: 3
  },
  {
    slug: 'read-20-minutes',
    name: 'Read for 20 Minutes',
    description: 'Spend time reading a book or educational material.',
    category: 'Learning',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '20:00',
    reminder_enabled: true,
    sort_order: 4
  },
  {
    slug: 'study-focused-work',
    name: 'Study or Focused Work',
    description: 'Complete a focused session on an important task.',
    category: 'Productivity',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '10:00',
    reminder_enabled: true,
    sort_order: 5
  },
  {
    slug: 'take-screen-break',
    name: 'Take a Screen Break',
    description: 'Take a short break from screens during the day.',
    category: 'Health',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '14:00',
    reminder_enabled: true,
    sort_order: 6
  },
  {
    slug: 'review-daily-goals',
    name: 'Review Daily Goals',
    description: 'Review the tasks and priorities planned for the day.',
    category: 'Productivity',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '18:30',
    reminder_enabled: true,
    sort_order: 7
  },
  {
    slug: 'plan-tomorrow',
    name: 'Plan Tomorrow',
    description: 'Review unfinished tasks and prepare for the next day.',
    category: 'Personal Development',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '21:30',
    reminder_enabled: true,
    sort_order: 8
  },
  {
    slug: 'maintain-sleep-schedule',
    name: 'Maintain a Sleep Schedule',
    description: 'Follow a consistent bedtime routine.',
    category: 'Sleep',
    frequency: 'Every day',
    scheduled_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminder_time: '22:30',
    reminder_enabled: true,
    sort_order: 9
  }
];

// Alias for backwards compatibility
export const STARTER_HABITS = PREDEFINED_HABITS;

export function getTodayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayAbbrev(dateObj) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dateObj.getDay()];
}

export function isHabitScheduledOnDate(habit, dateObj) {
  if (!habit) return false;

  // Respect start date
  if (habit.start_date) {
    const start = new Date(habit.start_date + 'T00:00:00');
    const cur = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    if (cur < start) return false;
  }

  const dayAbbrev = getDayAbbrev(dateObj);

  if (Array.isArray(habit.scheduled_days) && habit.scheduled_days.length > 0) {
    return habit.scheduled_days.includes(dayAbbrev);
  }

  if (habit.frequency === 'Weekdays (Mon-Fri)') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayAbbrev);
  }
  if (habit.frequency === 'Weekends (Sat-Sun)') {
    return ['Sat', 'Sun'].includes(dayAbbrev);
  }

  return true; // Every day
}

export function getPast7Days() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
    days.push({ iso, letter: dayLetter, isToday: i === 0, dateObj: d });
  }
  return days;
}

/**
 * Extracts first meaningful name from a user's full name or email address
 */
export function extractFirstName(fullName, email = '') {
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

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Initialize Dashboard Application
 */
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

export async function initDashboard() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client could not be initialized');
    window.location.replace('habitflow_auth.html');
    return;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      window.location.replace('habitflow_auth.html');
      return;
    }
    currentUser = session.user;
  } catch (err) {
    console.error('Session validation error:', err);
    window.location.replace('habitflow_auth.html');
    return;
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.replace('habitflow_auth.html');
    }
  });

  await fetchUserProfile();
  bindNavigationSystem();
  bindPreferencesModal();
  bindRemindersModal();
  bindSettingsModal();
  bindHabitModals();
  bindHabitControls();
  bindDailyReflectionModal();
  bindWeeklyReviewModal();
  bindCalendarNavigation();
  bindDataExport();
  await loadHabitsAndCompletions();
  startReminderWorker();
}

/**
 * Retrieves authenticated user profile and renders personalized greeting
 */
export async function fetchUserProfile() {
  const supabase = getSupabase();
  const email = currentUser?.email || '';
  const metadata = currentUser?.user_metadata || {};
  let fullName = metadata.full_name || metadata.name || '';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!error && data) {
      currentProfile = data;
      if (data.full_name) {
        fullName = data.full_name;
      }
    }
  } catch (e) {
    console.warn('Profile fetch warning:', e.message);
  }

  updateGreetingDisplay(fullName, email);
}

function updateGreetingDisplay(fullName, email) {
  const firstName = extractFirstName(fullName, email);
  const greetingHeading = document.getElementById('dashGreetingHeading');
  const userMenuName = document.getElementById('userMenuName');
  const userMenuEmail = document.getElementById('userMenuEmail');
  const userDropdownDisplayName = document.getElementById('userDropdownDisplayName');
  const mobileUserDisplayName = document.getElementById('mobileUserDisplayName');
  const mobileUserEmail = document.getElementById('mobileUserEmail');
  const avatarInitials = document.querySelectorAll('.user-avatar-initials');

  if (greetingHeading) {
    if (firstName) {
      greetingHeading.innerHTML = `Welcome back, <span id="dashGreetingFirstName">${escapeHtml(firstName)}</span>`;
    } else {
      greetingHeading.textContent = 'Welcome back';
    }
  }

  const displayName = fullName || firstName || email.split('@')[0] || 'User';
  if (userMenuName) userMenuName.textContent = firstName || displayName;
  if (userDropdownDisplayName) userDropdownDisplayName.textContent = displayName;
  if (userMenuEmail) userMenuEmail.textContent = email;
  if (mobileUserDisplayName) mobileUserDisplayName.textContent = displayName;
  if (mobileUserEmail) mobileUserEmail.textContent = email;

  const initials = (displayName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')) || 'HF';
  avatarInitials.forEach(el => el.textContent = initials);

  const settingsEmail = document.getElementById('settingsEmail');
  const settingsName = document.getElementById('settingsFullName');
  if (settingsEmail) settingsEmail.textContent = email;
  if (settingsName && !settingsName.value) settingsName.value = fullName;

  const dateEl = document.getElementById('dashCurrentDate');
  if (dateEl) {
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString(undefined, opts);
  }
}

export function getScheduledDaysForFrequency(frequency) {
  switch (frequency) {
    case 'Weekdays (Mon-Fri)':
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    case 'Weekends (Sat-Sun)':
      return ['Sat', 'Sun'];
    case 'Every day':
    default:
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
}

/**
 * Idempotently provisions the 9 Predefined Starter Habits for newly registered users.
 * Users can customize, edit, or delete them freely.
 * Intentionally deleted starter habits will not be recreated on subsequent logins or refreshes.
 */
async function ensurePredefinedHabits() {
  if (!currentUser) return false;
  const todayIso = getTodayIso();
  const supabase = getSupabase();

  const seededKey = `habitflow_starter_seeded_${currentUser.id}`;
  const deletedKey = `habitflow_deleted_habits_${currentUser.id}`;
  let hasSeeded = currentProfile?.has_onboarded || localStorage.getItem(seededKey) === 'true';

  if (userHabits.length > 0) {
    hasSeeded = true;
    localStorage.setItem(seededKey, 'true');
  }

  if (hasSeeded) {
    sortUserHabits();
    return false;
  }

  let deletedHabits = [];
  try {
    deletedHabits = JSON.parse(localStorage.getItem(deletedKey) || '[]');
  } catch (e) {}

  const existingSlugs = new Set();
  const existingNames = new Set();
  userHabits.forEach(h => {
    if (h.template_slug) existingSlugs.add(h.template_slug);
    if (h.name) existingNames.add(h.name.toLowerCase().trim());
  });

  const missingTemplates = PREDEFINED_HABITS.filter(template => {
    const slugMatch = existingSlugs.has(template.slug);
    const nameMatch = existingNames.has(template.name.toLowerCase().trim());
    const wasDeleted = deletedHabits.includes(template.slug);
    return !slugMatch && !nameMatch && !wasDeleted;
  });

  if (missingTemplates.length === 0) {
    sortUserHabits();
    localStorage.setItem(seededKey, 'true');
    saveHabitsToStorage();
    return false;
  }

  const fullRecordsToInsert = missingTemplates.map(t => ({
    user_id: currentUser.id,
    template_slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    frequency: t.frequency,
    scheduled_days: t.scheduled_days,
    start_date: todayIso,
    reminder_time: t.reminder_time,
    reminder_enabled: t.reminder_enabled,
    is_archived: false
  }));

  let insertedRecords = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('habits')
        .insert(fullRecordsToInsert)
        .select();

      if (!error && data && data.length > 0) {
        insertedRecords = data;
        showToast('Starter daily habits have been initialized for you.', 'success', 3500);
      } else if (error) {
        console.warn('Attempting fallback starter habit insert:', error.message);
        const standardRecordsToInsert = missingTemplates.map(t => ({
          user_id: currentUser.id,
          name: t.name,
          description: t.description,
          category: t.category,
          frequency: t.frequency,
          scheduled_days: t.scheduled_days,
          start_date: todayIso,
          reminder_time: t.reminder_time,
          reminder_enabled: t.reminder_enabled,
          is_archived: false
        }));

        const retryRes = await supabase
          .from('habits')
          .insert(standardRecordsToInsert)
          .select();

        if (!retryRes.error && retryRes.data && retryRes.data.length > 0) {
          insertedRecords = retryRes.data;
          showToast('Starter daily habits have been initialized for you.', 'success', 3500);
        }
      }
    } catch (err) {
      console.warn('Predefined habit provisioning exception:', err.message);
    }
  }

  if (insertedRecords && insertedRecords.length > 0) {
    userHabits = [...userHabits, ...insertedRecords];
  } else {
    const fallbackRecords = fullRecordsToInsert.map(h => ({
      ...h,
      id: `${currentUser.id}-${h.template_slug}`
    }));
    userHabits = [...userHabits, ...fallbackRecords];
  }

  sortUserHabits();
  localStorage.setItem(seededKey, 'true');
  if (supabase) {
    try {
      await supabase.from('profiles').update({ has_onboarded: true }).eq('id', currentUser.id);
    } catch (e) {}
  }

  saveHabitsToStorage();
  return true;
}

function saveHabitsToStorage() {
  if (!currentUser) return;
  try {
    localStorage.setItem(`habitflow_user_habits_${currentUser.id}`, JSON.stringify(userHabits));
  } catch (e) {}
}

function sortUserHabits() {
  const orderMap = new Map(PREDEFINED_HABITS.map((p, i) => [p.slug, i]));
  const nameMap = new Map(PREDEFINED_HABITS.map((p, i) => [p.name.toLowerCase(), i]));

  userHabits.sort((a, b) => {
    const aIdx = orderMap.has(a.template_slug) ? orderMap.get(a.template_slug) : (nameMap.get(a.name?.toLowerCase()) ?? 99);
    const bIdx = orderMap.has(b.template_slug) ? orderMap.get(b.template_slug) : (nameMap.get(b.name?.toLowerCase()) ?? 99);
    return aIdx - bIdx;
  });
}

/**
 * Loads habits, completions, and reflections reliably from Supabase with resilient fallbacks.
 */
async function loadHabitsAndCompletions() {
  if (!currentUser) return;
  const supabase = getSupabase();

  const container = document.getElementById('habitsContainer');
  if (container && (!userHabits || userHabits.length === 0)) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.loader}</div>
        <h3 class="empty-title">Loading daily habits...</h3>
      </div>
    `;
  }

  // 1. Read local cache first for instant render
  try {
    const cached = localStorage.getItem(`habitflow_user_habits_${currentUser.id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        userHabits = parsed;
        sortUserHabits();
        renderDashboard();
      }
    }
  } catch (e) {
    console.warn('Habit cache read warning:', e);
  }

  // 2. Query Supabase habits
  if (supabase) {
    try {
      const { data: habits, error: habitsErr } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

      if (!habitsErr && habits) {
        userHabits = habits;
      }
    } catch (err) {
      console.warn('Habit query exception:', err.message);
    }
  }

  // 3. Provision predefined starter habits if new user
  await ensurePredefinedHabits();

  // 4. Load completions & reflections
  await loadHabitCompletions();
  await loadDailyReflections();

  // 5. Full render
  renderDashboard();
}

async function loadHabitCompletions() {
  if (!currentUser) return;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 60);
      const pastIso = pastDate.toISOString().split('T')[0];

      const { data: completions, error: compErr } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('completed_date', pastIso);

      if (!compErr && completions) {
        habitCompletions = completions;
        try {
          localStorage.setItem(`habitflow_user_completions_${currentUser.id}`, JSON.stringify(completions));
        } catch (e) {}
      }
    } catch (compEx) {
      console.warn('Completions query exception:', compEx.message);
    }
  }

  if (habitCompletions.length === 0) {
    try {
      const cachedComp = localStorage.getItem(`habitflow_user_completions_${currentUser.id}`);
      if (cachedComp) {
        habitCompletions = JSON.parse(cachedComp) || [];
      }
    } catch (e) {}
  }
}

export async function loadDailyReflections() {
  if (!currentUser) return;
  const supabase = getSupabase();

  try {
    const cached = localStorage.getItem(`habitflow_reflections_${currentUser.id}`);
    if (cached) {
      dailyReflections = JSON.parse(cached) || [];
    }
  } catch (e) {}

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_reflections')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('reflection_date', { ascending: false });

      if (!error && data) {
        dailyReflections = data;
        try {
          localStorage.setItem(`habitflow_reflections_${currentUser.id}`, JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Daily reflections fetch error:', err.message);
    }
  }
}

export async function saveDailyReflection(dateIso, wentWell, struggled, improve) {
  if (!currentUser) throw new Error('User not authenticated');
  const supabase = getSupabase();

  const record = {
    user_id: currentUser.id,
    reflection_date: dateIso,
    went_well: (wentWell || '').trim(),
    struggled_with: (struggled || '').trim(),
    improve_tomorrow: (improve || '').trim(),
    updated_at: new Date().toISOString()
  };

  const existingIndex = dailyReflections.findIndex(r => r.reflection_date === dateIso);
  let savedRecord = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_reflections')
        .upsert(record, { onConflict: 'user_id,reflection_date' })
        .select()
        .single();

      if (!error && data) {
        savedRecord = data;
      }
    } catch (err) {
      console.warn('Supabase reflection save warning:', err.message);
    }
  }

  if (!savedRecord) {
    savedRecord = {
      ...record,
      id: existingIndex >= 0 ? dailyReflections[existingIndex].id : `refl-${Date.now()}`
    };
  }

  if (existingIndex >= 0) {
    dailyReflections[existingIndex] = savedRecord;
  } else {
    dailyReflections.unshift(savedRecord);
  }

  try {
    localStorage.setItem(`habitflow_reflections_${currentUser.id}`, JSON.stringify(dailyReflections));
  } catch (e) {}

  renderCalendarSection();
  return savedRecord;
}

function renderDashboard() {
  renderOverviewStats();
  renderHabitsGrid();
  renderAnalyticsSection();
  renderCalendarSection();
}

function renderOverviewStats() {
  const activeHabits = userHabits.filter(h => !h.is_archived);
  const total = activeHabits.length;
  const todayIso = getTodayIso();
  const todayObj = new Date();

  const todayScheduledHabits = activeHabits.filter(h => isHabitScheduledOnDate(h, todayObj));
  const scheduledCountToday = todayScheduledHabits.length;

  const todayCompletedHabitIds = new Set(
    habitCompletions.filter(c => c.completed_date === todayIso).map(c => c.habit_id)
  );
  const completedTodayCount = todayScheduledHabits.filter(h => todayCompletedHabitIds.has(h.id)).length;
  const percentToday = scheduledCountToday > 0 ? Math.round((completedTodayCount / scheduledCountToday) * 100) : 0;

  let maxStreak = 0;
  activeHabits.forEach(h => {
    const s = calculateHabitStreak(h.id);
    if (s > maxStreak) maxStreak = s;
  });

  const past7 = getPast7Days();
  let totalScheduledInPast7 = 0;
  let totalCompletionsInPast7 = 0;

  past7.forEach(d => {
    activeHabits.forEach(h => {
      if (isHabitScheduledOnDate(h, d.dateObj)) {
        totalScheduledInPast7++;
        if (habitCompletions.some(c => c.habit_id === h.id && c.completed_date === d.iso)) {
          totalCompletionsInPast7++;
        }
      }
    });
  });

  const weeklyRate = totalScheduledInPast7 > 0 ? Math.round((totalCompletionsInPast7 / totalScheduledInPast7) * 100) : 0;

  const totalEl = document.getElementById('statTotalHabits');
  const todayEl = document.getElementById('statCompletedToday');
  const todaySubEl = document.getElementById('statCompletedSub');
  const streakEl = document.getElementById('statBestStreak');
  const weeklyRateEl = document.getElementById('statWeeklyRate');
  const progressFillEl = document.getElementById('todayProgressFill');

  if (totalEl) totalEl.textContent = total;
  if (todayEl) todayEl.textContent = `${completedTodayCount}/${scheduledCountToday || total}`;
  if (todaySubEl) todaySubEl.textContent = scheduledCountToday === 0 ? 'No routines scheduled today' : `${percentToday}% completed today`;
  if (streakEl) streakEl.textContent = `${maxStreak} ${maxStreak === 1 ? 'day' : 'days'}`;
  if (weeklyRateEl) weeklyRateEl.textContent = `${weeklyRate}%`;
  if (progressFillEl) progressFillEl.style.width = `${percentToday}%`;
}

/**
 * Schedule-Aware Habit Streak Calculation
 * Respects habit frequency and rest days. A weekday-only habit will not break streak on weekends.
 */
export function calculateHabitStreak(habitId) {
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) return 0;

  const dates = new Set(
    habitCompletions.filter(c => c.habit_id === habitId).map(c => c.completed_date)
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const todayIso = getTodayIso();
  const isScheduledToday = isHabitScheduledOnDate(habit, cursor);

  // If scheduled today and done today, count today and walk backward.
  // If scheduled today and not yet done, cursor moves to yesterday without breaking streak.
  // If not scheduled today (rest day), cursor moves to yesterday.
  if (isScheduledToday && dates.has(todayIso)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 180; i++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const scheduled = isHabitScheduledOnDate(habit, cursor);

    if (scheduled) {
      if (dates.has(iso)) {
        streak++;
      } else {
        break; // Streak broken on missed scheduled opportunity
      }
    }
    // Rest day: skip without penalizing
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function calculateBestStreak(habitId) {
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) return 0;

  const dates = new Set(
    habitCompletions.filter(c => c.habit_id === habitId).map(c => c.completed_date)
  );

  if (dates.size === 0) return 0;

  let bestStreak = 0;
  let currentRun = 0;

  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 90);
  cursor.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (cursor <= today) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const scheduled = isHabitScheduledOnDate(habit, cursor);

    if (scheduled) {
      if (dates.has(iso)) {
        currentRun++;
        if (currentRun > bestStreak) bestStreak = currentRun;
      } else {
        currentRun = 0;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const currentStreak = calculateHabitStreak(habitId);
  return Math.max(bestStreak, currentStreak);
}

export function calculateHabitStats(habitId) {
  const habit = userHabits.find(h => h.id === habitId);
  const completions = habitCompletions.filter(c => c.habit_id === habitId);
  const compDates = new Set(completions.map(c => c.completed_date));

  const currentStreak = calculateHabitStreak(habitId);
  const bestStreak = calculateBestStreak(habitId);
  const totalCompleted = completions.length;

  const past7 = getPast7Days();
  let past7Scheduled = 0;
  let past7Completed = 0;

  past7.forEach(d => {
    if (habit && isHabitScheduledOnDate(habit, d.dateObj)) {
      past7Scheduled++;
      if (compDates.has(d.iso)) past7Completed++;
    }
  });

  const weeklyRate = past7Scheduled > 0 ? Math.round((past7Completed / past7Scheduled) * 100) : 0;

  return {
    currentStreak,
    bestStreak,
    totalCompleted,
    past7Scheduled,
    past7Completed,
    weeklyRate
  };
}

function renderHabitsGrid() {
  const container = document.getElementById('habitsContainer');
  const badgeEl = document.getElementById('archivedCountBadge');
  if (!container) return;

  const isArchivedView = currentHabitView === 'archived';
  const archivedHabits = userHabits.filter(h => Boolean(h.is_archived));
  const activeHabits = userHabits.filter(h => !h.is_archived);

  if (badgeEl) badgeEl.textContent = archivedHabits.length;

  let pool = isArchivedView ? archivedHabits : activeHabits;

  // 1. Filter by category
  if (activeCategory !== 'All') {
    pool = pool.filter(h => (h.category || 'General').toLowerCase() === activeCategory.toLowerCase());
  }

  // 2. Filter by search query
  if (habitSearchQuery) {
    pool = pool.filter(h => {
      const nameMatch = h.name.toLowerCase().includes(habitSearchQuery);
      const descMatch = (h.description || '').toLowerCase().includes(habitSearchQuery);
      return nameMatch || descMatch;
    });
  }

  const todayIso = getTodayIso();

  // 3. Filter by status (all | pending | completed)
  if (activeStatusFilter === 'completed') {
    pool = pool.filter(h => habitCompletions.some(c => c.habit_id === h.id && c.completed_date === todayIso));
  } else if (activeStatusFilter === 'pending') {
    pool = pool.filter(h => !habitCompletions.some(c => c.habit_id === h.id && c.completed_date === todayIso));
  }

  // 4. Sort
  const sorted = [...pool];
  if (habitSortOrder === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (habitSortOrder === 'streak-desc') {
    sorted.sort((a, b) => calculateHabitStreak(b.id) - calculateHabitStreak(a.id));
  } else if (habitSortOrder === 'completion-desc') {
    sorted.sort((a, b) => calculateHabitStats(b.id).weeklyRate - calculateHabitStats(a.id).weeklyRate);
  } else if (habitSortOrder === 'newest') {
    sorted.sort((a, b) => new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0));
  }

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${isArchivedView ? ICONS.archive : ICONS.calendarPlus}</div>
        <h3 class="empty-title">${isArchivedView ? 'No archived habits' : 'No habits found'}</h3>
        <p class="empty-sub">
          ${isArchivedView ? 'Habits you pause or archive will appear here safely preserved.' : 'Try adjusting your search query, status filters, or category tab.'}
        </p>
      </div>
    `;
    return;
  }

  const past7Days = getPast7Days();

  container.innerHTML = sorted.map(habit => {
    const streak = calculateHabitStreak(habit.id);
    const isDoneToday = habitCompletions.some(c => c.habit_id === habit.id && c.completed_date === todayIso);
    const isScheduledToday = isHabitScheduledOnDate(habit, new Date());

    const weekDotsHtml = past7Days.map(day => {
      const isDone = habitCompletions.some(c => c.habit_id === habit.id && c.completed_date === day.iso);
      const isScheduled = isHabitScheduledOnDate(habit, day.dateObj);
      return `
        <div class="tracker-day ${isDone ? 'done' : ''} ${day.isToday ? 'today' : ''} ${!isScheduled ? 'not-scheduled' : ''}" title="${day.iso}: ${isDone ? 'Completed' : (isScheduled ? 'Scheduled' : 'Rest day')}">
          <div class="tracker-dot">${isDone ? ICONS.check : ''}</div>
          <span>${day.letter}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="habit-item-card ${isDoneToday ? 'is-completed' : ''} ${habit.is_archived ? 'is-archived' : ''}" data-habit-id="${habit.id}">
        <div>
          <div class="habit-head-row">
            <div style="display:flex;align-items:flex-start;gap:12px">
              ${!habit.is_archived ? `
                <label class="habit-check-control" aria-label="${isDoneToday ? 'Mark as incomplete' : 'Mark as completed'}">
                  <input type="checkbox"
                         class="habit-checkbox"
                         data-action="toggle-checkin"
                         data-habit-id="${habit.id}"
                         ${isDoneToday ? 'checked' : ''} />
                  <span class="habit-check-custom">
                    ${isDoneToday ? ICONS.check : ''}
                  </span>
                </label>
              ` : `
                <span class="habit-check-custom" style="opacity:0.4;cursor:default" title="Archived routine">
                  ${ICONS.archive}
                </span>
              `}
              <div>
                <h3 class="habit-name">${escapeHtml(habit.name)}</h3>
                ${habit.description ? `<p class="habit-desc">${escapeHtml(habit.description)}</p>` : ''}
                <div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">
                  ${habit.target_quantity ? `
                    <span class="habit-target-tag" title="Target goal">${ICONS.target} ${escapeHtml(habit.target_quantity)}</span>
                  ` : ''}
                  <span class="habit-freq-tag">${escapeHtml(habit.frequency || 'Every day')}</span>
                </div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
              <span class="habit-cat-tag">${escapeHtml(habit.category || 'General')}</span>
              ${habit.reminder_time ? `
                <button type="button" class="habit-reminder-tag" data-action="open-habit-reminder" data-habit-id="${habit.id}" title="Daily reminder at ${escapeHtml(habit.reminder_time)}. Click to adjust.">
                  ${ICONS.bell}
                  <span>${escapeHtml(habit.reminder_time)}</span>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="habit-week-tracker">
            ${weekDotsHtml}
          </div>
        </div>

        <div class="habit-foot-row">
          <div class="streak-pill">
            ${ICONS.flame}
            <span><b>${streak}</b> ${streak === 1 ? 'day' : 'days'} streak</span>
          </div>

          <div class="habit-actions">
            ${!habit.is_archived ? `
              <button type="button"
                      class="check-in-btn ${isDoneToday ? 'is-done' : ''}"
                      data-action="toggle-checkin"
                      data-habit-id="${habit.id}"
                      aria-label="${isDoneToday ? 'Undo completion' : 'Mark as completed'}">
                ${isDoneToday ? ICONS.check : ''}
                <span>${isDoneToday ? 'Completed' : 'Check In'}</span>
              </button>
              <button type="button"
                      class="icon-btn"
                      data-action="open-habit-reminder"
                      data-habit-id="${habit.id}"
                      title="Configure daily reminder"
                      aria-label="Configure reminder">
                ${ICONS.bell}
              </button>
              <button type="button"
                      class="icon-btn"
                      data-action="edit-habit"
                      data-habit-id="${habit.id}"
                      title="Edit habit"
                      aria-label="Edit habit">
                ${ICONS.edit}
              </button>
              <button type="button"
                      class="icon-btn danger-hover"
                      data-action="delete-habit"
                      data-habit-id="${habit.id}"
                      title="Delete or archive habit"
                      aria-label="Delete habit">
                ${ICONS.trash}
              </button>
            ` : `
              <button type="button"
                      class="btn-subtle"
                      data-action="restore-habit"
                      data-habit-id="${habit.id}"
                      style="font-size:11.5px;padding:4px 10px">
                ${ICONS.rotateCcw}
                <span>Restore Routine</span>
              </button>
              <button type="button"
                      class="icon-btn danger-hover"
                      data-action="delete-habit"
                      data-habit-id="${habit.id}"
                      title="Delete permanently"
                      aria-label="Delete permanently">
                ${ICONS.trash}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Toggles habit completion for the local calendar date
 */
async function toggleHabitCheckIn(habitId, control) {
  if (!currentUser) return;
  const supabase = getSupabase();
  const todayIso = getTodayIso();
  const existingIndex = habitCompletions.findIndex(
    c => c.habit_id === habitId && c.completed_date === todayIso
  );

  if (control) control.disabled = true;

  try {
    if (existingIndex >= 0) {
      if (supabase) {
        try {
          await supabase
            .from('habit_completions')
            .delete()
            .eq('habit_id', habitId)
            .eq('completed_date', todayIso)
            .eq('user_id', currentUser.id);
        } catch (dbErr) {
          console.warn('Remote completion delete warning:', dbErr);
        }
      }

      habitCompletions.splice(existingIndex, 1);
      try {
        localStorage.setItem(`habitflow_user_completions_${currentUser.id}`, JSON.stringify(habitCompletions));
      } catch (e) {}
      showToast('Habit completion undone', 'info');
    } else {
      const newCompletion = {
        habit_id: habitId,
        user_id: currentUser.id,
        completed_date: todayIso
      };

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('habit_completions')
            .insert(newCompletion)
            .select()
            .single();

          if (!error && data) {
            newCompletion.id = data.id;
          }
        } catch (dbErr) {
          console.warn('Remote completion insert warning:', dbErr);
        }
      }

      habitCompletions.push(newCompletion);
      try {
        localStorage.setItem(`habitflow_user_completions_${currentUser.id}`, JSON.stringify(habitCompletions));
      } catch (e) {}
      showToast('Habit marked as completed for today', 'success');
    }

    renderDashboard();
  } catch (err) {
    console.error('Check-in error:', err);
    showToast(formatAuthError(err), 'error');
  } finally {
    if (control) control.disabled = false;
  }
}

/**
 * Create a new custom or personal habit
 */
export async function createHabit(habitData) {
  if (!currentUser) throw new Error('User not authenticated');
  if (!habitData.name || habitData.name.trim().length < 2) {
    throw new Error('Habit name must be at least 2 characters long');
  }

  const supabase = getSupabase();
  const todayIso = getTodayIso();
  const scheduledDays = habitData.scheduled_days || getScheduledDaysForFrequency(habitData.frequency || 'Every day');

  const newRecord = {
    user_id: currentUser.id,
    template_slug: null,
    name: habitData.name.trim(),
    description: (habitData.description || '').trim(),
    category: habitData.category || 'General',
    frequency: habitData.frequency || 'Every day',
    scheduled_days: scheduledDays,
    target_quantity: habitData.target_quantity || null,
    start_date: habitData.start_date || todayIso,
    reminder_time: habitData.reminder_enabled ? (habitData.reminder_time || '08:00') : null,
    reminder_enabled: Boolean(habitData.reminder_enabled),
    is_archived: false
  };

  let createdHabit = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('habits')
        .insert(newRecord)
        .select()
        .single();

      if (!error && data) {
        createdHabit = data;
      } else if (error) {
        console.warn('Supabase habit creation error, using local storage fallback:', error.message);
      }
    } catch (e) {
      console.warn('Supabase insert exception:', e);
    }
  }

  if (!createdHabit) {
    createdHabit = {
      ...newRecord,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString()
    };
  }

  userHabits.push(createdHabit);
  sortUserHabits();
  saveHabitsToStorage();
  renderDashboard();
  return createdHabit;
}

/**
 * Update an existing habit
 */
export async function updateHabit(habitId, patch) {
  if (!currentUser) throw new Error('User not authenticated');
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  if (patch.name !== undefined && patch.name.trim().length < 2) {
    throw new Error('Habit name must be at least 2 characters long');
  }

  const scheduledDays = patch.scheduled_days !== undefined
    ? patch.scheduled_days
    : (patch.frequency ? getScheduledDaysForFrequency(patch.frequency) : habit.scheduled_days);

  const updateFields = {
    ...patch,
    name: patch.name ? patch.name.trim() : habit.name,
    description: patch.description !== undefined ? patch.description.trim() : habit.description,
    category: patch.category || habit.category,
    frequency: patch.frequency || habit.frequency,
    scheduled_days: scheduledDays,
    target_quantity: patch.target_quantity !== undefined ? patch.target_quantity : habit.target_quantity,
    start_date: patch.start_date || habit.start_date,
    updated_at: new Date().toISOString()
  };

  Object.assign(habit, updateFields);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('habits')
        .update(updateFields)
        .eq('id', habitId)
        .eq('user_id', currentUser.id);
    } catch (e) {
      console.warn('Supabase update exception:', e);
    }
  }

  sortUserHabits();
  saveHabitsToStorage();
  renderDashboard();
  return habit;
}

/**
 * Archive a habit (pauses routine without deleting historical completion records)
 */
export async function archiveHabit(habitId) {
  if (!currentUser) throw new Error('User not authenticated');
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  habit.is_archived = true;
  habit.updated_at = new Date().toISOString();

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('habits')
        .update({ is_archived: true, updated_at: habit.updated_at })
        .eq('id', habitId)
        .eq('user_id', currentUser.id);
    } catch (e) {
      console.warn('Supabase archive exception:', e);
    }
  }

  saveHabitsToStorage();
  renderDashboard();
  showToast(`Archived "${habit.name}". You can restore it anytime.`, 'info');
  return true;
}

/**
 * Unarchive / restore a paused habit
 */
export async function unarchiveHabit(habitId) {
  if (!currentUser) throw new Error('User not authenticated');
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  habit.is_archived = false;
  habit.updated_at = new Date().toISOString();

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('habits')
        .update({ is_archived: false, updated_at: habit.updated_at })
        .eq('id', habitId)
        .eq('user_id', currentUser.id);
    } catch (e) {
      console.warn('Supabase unarchive exception:', e);
    }
  }

  saveHabitsToStorage();
  renderDashboard();
  showToast(`Restored "${habit.name}" to active routines.`, 'success');
  return true;
}

/**
 * Delete a habit (soft-delete / archive to preserve historical completion records and statistics)
 */
export async function deleteHabit(habitId, permanent = false) {
  if (!currentUser) throw new Error('User not authenticated');
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  // Track in deleted habits storage so starter habits are not re-seeded
  try {
    const deletedKey = `habitflow_deleted_habits_${currentUser.id}`;
    const deletedList = JSON.parse(localStorage.getItem(deletedKey) || '[]');
    if (habit.template_slug && !deletedList.includes(habit.template_slug)) {
      deletedList.push(habit.template_slug);
    }
    deletedList.push(habit.id);
    localStorage.setItem(deletedKey, JSON.stringify(deletedList));
  } catch (e) {}

  if (permanent) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('habits')
          .delete()
          .eq('id', habitId)
          .eq('user_id', currentUser.id);
      } catch (e) {
        console.warn('Supabase hard delete exception:', e);
      }
    }
    const idx = userHabits.findIndex(h => h.id === habitId);
    if (idx >= 0) userHabits.splice(idx, 1);
  } else {
    habit.is_archived = true;
    habit.updated_at = new Date().toISOString();
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('habits')
          .update({ is_archived: true, updated_at: habit.updated_at })
          .eq('id', habitId)
          .eq('user_id', currentUser.id);
      } catch (e) {
        console.warn('Supabase delete/archive exception:', e);
      }
    }
  }

  saveHabitsToStorage();
  renderDashboard();
  return true;
}

/**
 * Render Advanced Analytics (7-day trend chart, performance highlights, streaks)
 */
export function renderAnalyticsSection() {
  const container = document.getElementById('weeklyTrendChart');
  const avgBadge = document.getElementById('analyticsWeeklyAvg');
  const bestHabitEl = document.getElementById('bestPerformingHabit');
  const bestRateEl = document.getElementById('bestPerformingRate');
  const attentionHabitEl = document.getElementById('attentionHabit');
  const attentionRateEl = document.getElementById('attentionRate');
  const checkinsCountEl = document.getElementById('totalCheckinsCount');
  const consistencyScoreEl = document.getElementById('overallConsistencyScore');

  const activeHabits = userHabits.filter(h => !h.is_archived);
  const past7Days = getPast7Days();

  let totalScheduled7 = 0;
  let totalCompleted7 = 0;

  const chartData = past7Days.map(day => {
    let scheduledCount = 0;
    let completedCount = 0;

    activeHabits.forEach(h => {
      if (isHabitScheduledOnDate(h, day.dateObj)) {
        scheduledCount++;
        const isDone = habitCompletions.some(c => c.habit_id === h.id && c.completed_date === day.iso);
        if (isDone) completedCount++;
      }
    });

    totalScheduled7 += scheduledCount;
    totalCompleted7 += completedCount;

    const rate = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;
    return {
      day: day.letter,
      iso: day.iso,
      rate,
      completed: completedCount,
      scheduled: scheduledCount,
      isToday: day.isToday
    };
  });

  const avgRate7 = totalScheduled7 > 0 ? Math.round((totalCompleted7 / totalScheduled7) * 100) : 0;
  if (avgBadge) avgBadge.textContent = `${avgRate7}% consistency`;

  if (container) {
    const chartW = 420;
    const chartH = 160;
    const padding = { top: 22, bottom: 30, left: 15, right: 15 };
    const barW = 28;
    const usableW = chartW - padding.left - padding.right;
    const step = usableW / (chartData.length || 1);

    const barsSvg = chartData.map((d, i) => {
      const x = padding.left + i * step + (step - barW) / 2;
      const maxBarH = chartH - padding.top - padding.bottom;
      const barH = Math.max(4, (d.rate / 100) * maxBarH);
      const y = chartH - padding.bottom - barH;
      const fillColor = d.isToday ? 'var(--accent-primary)' : 'rgba(155, 225, 93, 0.7)';

      return `
        <g class="chart-bar-group" tabindex="0" role="img" aria-label="${d.iso}: ${d.rate}%">
          <title>${d.iso}: ${d.rate}% (${d.completed}/${d.scheduled} scheduled habits)</title>
          <rect x="${x}" y="${padding.top}" width="${barW}" height="${maxBarH}" rx="4" fill="var(--surface-field)" opacity="0.6"/>
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${fillColor}">
            <animate attributeName="height" from="0" to="${barH}" dur="0.4s" fill="freeze" />
            <animate attributeName="y" from="${chartH - padding.bottom}" to="${y}" dur="0.4s" fill="freeze" />
          </rect>
          <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-muted)">${d.rate}%</text>
          <text x="${x + barW / 2}" y="${chartH - 10}" text-anchor="middle" font-size="11" font-weight="${d.isToday ? '700' : '500'}" fill="${d.isToday ? 'var(--accent-primary)' : 'var(--text-secondary)'}">${d.day}</text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${chartW} ${chartH}" width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible">
        ${barsSvg}
      </svg>
    `;
  }

  let bestHabit = null;
  let bestRate = -1;
  let worstHabit = null;
  let worstRate = 999;

  activeHabits.forEach(h => {
    const stats = calculateHabitStats(h.id);
    if (stats.past7Scheduled > 0) {
      if (stats.weeklyRate > bestRate) {
        bestRate = stats.weeklyRate;
        bestHabit = h;
      }
      if (stats.weeklyRate < worstRate) {
        worstRate = stats.weeklyRate;
        worstHabit = h;
      }
    }
  });

  if (bestHabitEl) bestHabitEl.textContent = bestHabit ? bestHabit.name : 'All routines on track';
  if (bestRateEl) bestRateEl.textContent = bestHabit ? `${bestRate}%` : '100%';
  if (attentionHabitEl) attentionHabitEl.textContent = (worstHabit && worstRate < 100) ? worstHabit.name : 'None (strong consistency)';
  if (attentionRateEl) attentionRateEl.textContent = (worstHabit && worstRate < 100) ? `${worstRate}%` : '-';

  const lifetimeCompletions = habitCompletions.length;
  if (checkinsCountEl) checkinsCountEl.textContent = lifetimeCompletions;

  let totalScheduledAllTime = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    activeHabits.forEach(h => {
      if (isHabitScheduledOnDate(h, d)) totalScheduledAllTime++;
    });
  }

  const overallScore = totalScheduledAllTime > 0
    ? Math.min(100, Math.round((lifetimeCompletions / totalScheduledAllTime) * 100))
    : 0;

  if (consistencyScoreEl) consistencyScoreEl.textContent = `${overallScore}%`;

  renderWeeklyReview(totalCompleted7, totalScheduled7, avgRate7, bestHabit);
}

/**
 * Render Weekly Review Summary (neutral, encouraging insights)
 */
export function renderWeeklyReview(completedCount = 0, scheduledCount = 0, weeklyRate = 0, bestHabit = null) {
  const bannerText = document.getElementById('weeklyInsightText');
  const modalDateRange = document.getElementById('weeklyReviewDateRange');
  const statsSummaryGrid = document.getElementById('weeklyStatsSummaryGrid');
  const reviewInsightBox = document.getElementById('weeklyReviewInsightBox');

  const past7 = getPast7Days();
  const dateRangeStr = `${past7[0].iso} to ${past7[past7.length - 1].iso}`;

  if (modalDateRange) modalDateRange.textContent = dateRangeStr;

  let insightMsg = '';
  if (scheduledCount === 0) {
    insightMsg = 'You have not set any active habit routines yet. Add your first routine to begin building momentum.';
  } else if (weeklyRate >= 80) {
    insightMsg = `You completed ${completedCount} of ${scheduledCount} scheduled habit opportunities this week (${weeklyRate}%). ${bestHabit ? `"${bestHabit.name}" was your most consistent habit.` : ''} Outstanding consistency!`;
  } else if (weeklyRate >= 50) {
    insightMsg = `You completed ${completedCount} of ${scheduledCount} scheduled habit opportunities this week (${weeklyRate}%). ${bestHabit ? `"${bestHabit.name}" showed solid progress.` : ''} Steady consistency builds lasting routines.`;
  } else if (completedCount > 0) {
    insightMsg = `You completed ${completedCount} of ${scheduledCount} scheduled habit opportunities this week (${weeklyRate}%). Every small step counts. Focus on one key routine tomorrow.`;
  } else {
    insightMsg = `You have ${scheduledCount} scheduled habit opportunities for this week. Check in each day to start building your streak.`;
  }

  if (bannerText) bannerText.textContent = insightMsg;
  if (reviewInsightBox) reviewInsightBox.textContent = insightMsg;

  if (statsSummaryGrid) {
    statsSummaryGrid.innerHTML = `
      <div class="highlight-item">
        <div class="highlight-meta">
          <span class="highlight-label">Scheduled Habit Opportunities</span>
          <strong class="highlight-val">${scheduledCount}</strong>
        </div>
        <span class="highlight-stat">Past 7 Days</span>
      </div>
      <div class="highlight-item">
        <div class="highlight-meta">
          <span class="highlight-label">Habits Completed</span>
          <strong class="highlight-val">${completedCount}</strong>
        </div>
        <span class="highlight-stat">${weeklyRate}% Completion</span>
      </div>
      <div class="highlight-item">
        <div class="highlight-meta">
          <span class="highlight-label">Top Performer</span>
          <strong class="highlight-val">${bestHabit ? escapeHtml(bestHabit.name) : '-'}</strong>
        </div>
        <span class="highlight-stat">Most Consistent</span>
      </div>
    `;
  }
}

/**
 * Render Calendar Grid and Selected Date Details
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function renderCalendarSection() {
  const monthTitle = document.getElementById('calendarMonthTitle');
  const daysGrid = document.getElementById('calendarDaysGrid');
  if (!monthTitle || !daysGrid) return;

  monthTitle.textContent = `${MONTH_NAMES[currentCalMonth]} ${currentCalYear}`;

  const firstDay = new Date(currentCalYear, currentCalMonth, 1);
  const lastDay = new Date(currentCalYear, currentCalMonth + 1, 0);
  const numDays = lastDay.getDate();
  const startDayIdx = (firstDay.getDay() + 6) % 7; // Monday as first col

  const prevMonthLastDay = new Date(currentCalYear, currentCalMonth, 0).getDate();
  const cells = [];

  for (let i = startDayIdx - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    cells.push(`
      <div class="cal-day-cell other-month" aria-hidden="true">
        <span>${dayNum}</span>
      </div>
    `);
  }

  const todayIso = getTodayIso();
  const activeHabits = userHabits.filter(h => !h.is_archived);

  for (let d = 1; d <= numDays; d++) {
    const monthStr = String(currentCalMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateIso = `${currentCalYear}-${monthStr}-${dayStr}`;
    const dateObj = new Date(currentCalYear, currentCalMonth, d);

    const isToday = dateIso === todayIso;
    const isSelected = dateIso === selectedCalDate;

    const dayCompletions = habitCompletions.filter(c => c.completed_date === dateIso);
    const compCount = dayCompletions.length;
    const scheduledHabits = activeHabits.filter(h => isHabitScheduledOnDate(h, dateObj));
    const schedCount = scheduledHabits.length;

    let dotHtml = '';
    if (compCount > 0) {
      const dotsCount = Math.min(3, compCount);
      const dots = Array.from({ length: dotsCount }).map(() => '<span class="cal-dot"></span>').join('');
      dotHtml = `<div class="cal-dots-wrap">${dots}</div>`;
    }

    cells.push(`
      <button type="button"
              class="cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'selected' : ''}"
              data-date="${dateIso}"
              aria-label="${dateIso}: ${compCount} completed of ${schedCount} scheduled">
        <span>${d}</span>
        ${dotHtml}
      </button>
    `);
  }

  const totalCells = cells.length;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells.push(`
      <div class="cal-day-cell other-month" aria-hidden="true">
        <span>${i}</span>
      </div>
    `);
  }

  daysGrid.innerHTML = cells.join('');
  renderSelectedDayDetails(selectedCalDate);
}

export function renderSelectedDayDetails(dateIso) {
  const heading = document.getElementById('calSelectedDateHeading');
  const habitsList = document.getElementById('calSelectedDayHabitsList');
  const reflectionBox = document.getElementById('calSelectedDayReflectionBox');
  const openReflectionBtn = document.getElementById('calOpenReflectionForDateBtn');

  if (openReflectionBtn) {
    openReflectionBtn.onclick = () => {
      if (typeof window.openDailyReflectionModal === 'function') {
        window.openDailyReflectionModal(dateIso);
      }
    };
  }

  if (heading) {
    const dObj = new Date(dateIso + 'T00:00:00');
    const opts = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    heading.textContent = dObj.toLocaleDateString(undefined, opts);
  }

  const dObj = new Date(dateIso + 'T00:00:00');
  const activeHabits = userHabits.filter(h => !h.is_archived);
  const scheduledHabits = activeHabits.filter(h => isHabitScheduledOnDate(h, dObj));

  if (habitsList) {
    if (scheduledHabits.length === 0) {
      habitsList.innerHTML = `<p style="font-size:12.5px;color:var(--text-muted);margin:4px 0">No habits were scheduled for this date.</p>`;
    } else {
      habitsList.innerHTML = scheduledHabits.map(h => {
        const isDone = habitCompletions.some(c => c.habit_id === h.id && c.completed_date === dateIso);
        return `
          <div class="day-habit-row ${isDone ? 'completed' : ''}">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="color:${isDone ? 'var(--accent-primary)' : 'var(--text-muted)'}">${isDone ? ICONS.check : ICONS.clock}</span>
              <span style="font-weight:600;color:var(--text-primary)">${escapeHtml(h.name)}</span>
            </div>
            <span style="font-size:11.5px;font-weight:600;color:${isDone ? 'var(--accent-primary)' : 'var(--text-muted)'}">
              ${isDone ? 'Completed' : 'Not completed'}
            </span>
          </div>
        `;
      }).join('');
    }
  }

  const reflection = dailyReflections.find(r => r.reflection_date === dateIso);
  if (reflectionBox) {
    if (reflection && (reflection.went_well || reflection.struggled_with || reflection.improve_tomorrow)) {
      reflectionBox.style.display = 'block';
      reflectionBox.innerHTML = `
        <div style="font-weight:700;color:var(--text-primary);margin-bottom:6px">Daily Reflection:</div>
        ${reflection.went_well ? `<div style="margin-bottom:4px"><b>Went Well:</b> ${escapeHtml(reflection.went_well)}</div>` : ''}
        ${reflection.struggled_with ? `<div style="margin-bottom:4px"><b>Struggled With:</b> ${escapeHtml(reflection.struggled_with)}</div>` : ''}
        ${reflection.improve_tomorrow ? `<div><b>To Improve:</b> ${escapeHtml(reflection.improve_tomorrow)}</div>` : ''}
      `;
    } else {
      reflectionBox.style.display = 'block';
      reflectionBox.innerHTML = `<span style="color:var(--text-muted)">No reflection recorded for this date. Click "Daily Reflection" above to add one.</span>`;
    }
  }
}

/**
 * Data Export Functionality (JSON & CSV)
 */
export function exportUserData(format = 'json') {
  if (!currentUser) return;
  const todayIso = getTodayIso();

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: currentUser.id,
      email: currentUser.email,
      name: currentProfile?.full_name || currentUser.user_metadata?.full_name || ''
    },
    habits: userHabits.map(h => ({
      id: h.id,
      name: h.name,
      description: h.description,
      category: h.category,
      frequency: h.frequency,
      scheduled_days: h.scheduled_days,
      target_quantity: h.target_quantity || null,
      start_date: h.start_date,
      reminder_time: h.reminder_time,
      reminder_enabled: h.reminder_enabled,
      is_archived: Boolean(h.is_archived),
      created_at: h.created_at
    })),
    completions: habitCompletions.map(c => ({
      habit_id: c.habit_id,
      completed_date: c.completed_date
    })),
    reflections: dailyReflections.map(r => ({
      date: r.reflection_date,
      went_well: r.went_well,
      struggled_with: r.struggled_with,
      improve_tomorrow: r.improve_tomorrow
    }))
  };

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitflow-export-${todayIso}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Habit data exported successfully as JSON', 'success');
  } else if (format === 'csv') {
    let csv = 'Type,ID,Name,Category,Frequency,Detail,Status\n';
    exportPayload.habits.forEach(h => {
      csv += `Habit,"${h.id}","${(h.name || '').replace(/"/g, '""')}","${h.category}","${h.frequency}","${h.start_date}","${h.is_archived ? 'Archived' : 'Active'}"\n`;
    });
    exportPayload.completions.forEach(c => {
      csv += `Completion,"${c.habit_id}","","","","${c.completed_date}","Completed"\n`;
    });
    exportPayload.reflections.forEach(r => {
      csv += `Reflection,"","${(r.went_well || '').replace(/"/g, '""')}","${(r.struggled_with || '').replace(/"/g, '""')}","${(r.improve_tomorrow || '').replace(/"/g, '""')}","${r.date}","Saved"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitflow-export-${todayIso}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Habit data exported successfully as CSV', 'success');
  }
}

/**
 * Open the Add/Edit Habit Modal in edit mode
 */
export function openEditHabitModal(habitId) {
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) return;

  const habitModal = document.getElementById('habitModal');
  const habitEditIdInput = document.getElementById('habitEditId');
  const habitNameInput = document.getElementById('habitNameInput');
  const habitDescInput = document.getElementById('habitDescInput');
  const habitCatSelect = document.getElementById('habitCategorySelect');
  const habitFreqSelect = document.getElementById('habitFrequencySelect');
  const habitCustomDaysWrap = document.getElementById('habitCustomDaysWrap');
  const habitTargetQuantityInput = document.getElementById('habitTargetQuantityInput');
  const habitStartDateInput = document.getElementById('habitStartDateInput');
  const habitRemindEnable = document.getElementById('habitReminderEnableInput');
  const habitRemindTime = document.getElementById('habitReminderTimeInput');
  const habitModalTitle = document.getElementById('habitModalTitle');
  const saveHabitBtn = document.getElementById('saveHabitBtn');
  const habitStatus = document.getElementById('habitFormStatus');

  if (habitEditIdInput) habitEditIdInput.value = habit.id;
  if (habitModalTitle) habitModalTitle.textContent = 'Edit Habit';
  if (saveHabitBtn) saveHabitBtn.textContent = 'Save Changes';
  if (habitNameInput) habitNameInput.value = habit.name;
  if (habitDescInput) habitDescInput.value = habit.description || '';
  if (habitCatSelect) habitCatSelect.value = habit.category || 'General';
  if (habitFreqSelect) habitFreqSelect.value = habit.frequency || 'Every day';
  if (habitTargetQuantityInput) habitTargetQuantityInput.value = habit.target_quantity || '';
  if (habitStartDateInput) habitStartDateInput.value = habit.start_date || getTodayIso();

  if (habitCustomDaysWrap) {
    const isCustom = habit.frequency === 'Custom recurring schedule';
    habitCustomDaysWrap.style.display = isCustom ? 'block' : 'none';
    if (isCustom && Array.isArray(habit.scheduled_days)) {
      document.querySelectorAll('#customDaysGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = habit.scheduled_days.includes(cb.value);
      });
    }
  }

  if (habitRemindEnable) habitRemindEnable.checked = habit.reminder_enabled !== false;
  if (habitRemindTime) habitRemindTime.value = habit.reminder_time || '08:00';
  if (habitStatus) {
    habitStatus.style.display = 'none';
    habitStatus.textContent = '';
    habitStatus.className = 'form-status';
  }

  if (habitModal) habitModal.classList.add('is-open');
  setTimeout(() => habitNameInput?.focus(), 80);
}

/**
 * Open the Delete Habit Confirmation Modal
 */
export function openDeleteHabitModal(habitId) {
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) return;

  const deleteModal = document.getElementById('deleteHabitModal');
  const deleteHabitIdInput = document.getElementById('deleteHabitId');
  const deleteModalMessage = document.getElementById('deleteModalMessage');

  if (deleteHabitIdInput) deleteHabitIdInput.value = habit.id;
  if (deleteModalMessage) {
    deleteModalMessage.innerHTML = `Are you sure you want to delete <strong>${escapeHtml(habit.name)}</strong>? You can archive it to pause it, or delete it permanently. Your historical completion records and statistics will be preserved.`;
  }

  if (deleteModal) deleteModal.classList.add('is-open');
}

/**
 * Bind Add/Edit/Delete Habit Modals
 */
export function bindHabitModals() {
  const habitModal = document.getElementById('habitModal');
  const habitForm = document.getElementById('habitForm');
  const openAddBtn = document.getElementById('openAddHabitModalBtn');
  const closeHabitBtn = document.getElementById('closeHabitModalBtn');
  const cancelHabitBtn = document.getElementById('cancelHabitModalBtn');
  const saveHabitBtn = document.getElementById('saveHabitBtn');
  const habitEditIdInput = document.getElementById('habitEditId');
  const habitNameInput = document.getElementById('habitNameInput');
  const habitDescInput = document.getElementById('habitDescInput');
  const habitCatSelect = document.getElementById('habitCategorySelect');
  const habitFreqSelect = document.getElementById('habitFrequencySelect');
  const habitCustomDaysWrap = document.getElementById('habitCustomDaysWrap');
  const habitTargetQuantityInput = document.getElementById('habitTargetQuantityInput');
  const habitStartDateInput = document.getElementById('habitStartDateInput');
  const habitRemindEnable = document.getElementById('habitReminderEnableInput');
  const habitRemindTime = document.getElementById('habitReminderTimeInput');
  const habitStatus = document.getElementById('habitFormStatus');
  const habitModalTitle = document.getElementById('habitModalTitle');

  const deleteModal = document.getElementById('deleteHabitModal');
  const closeDeleteBtn = document.getElementById('closeDeleteModalBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteModalBtn');
  const archiveHabitModalBtn = document.getElementById('archiveHabitModalBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteHabitBtn');
  const deleteHabitIdInput = document.getElementById('deleteHabitId');

  if (habitFreqSelect && habitCustomDaysWrap) {
    habitFreqSelect.addEventListener('change', () => {
      habitCustomDaysWrap.style.display = habitFreqSelect.value === 'Custom recurring schedule' ? 'block' : 'none';
    });
  }

  const openAddModal = () => {
    if (!habitModal) return;
    if (habitEditIdInput) habitEditIdInput.value = '';
    if (habitModalTitle) habitModalTitle.textContent = 'Add New Habit';
    if (saveHabitBtn) saveHabitBtn.textContent = 'Save Habit';
    if (habitForm) habitForm.reset();
    if (habitCatSelect) habitCatSelect.value = 'Personal Development';
    if (habitFreqSelect) habitFreqSelect.value = 'Every day';
    if (habitCustomDaysWrap) habitCustomDaysWrap.style.display = 'none';
    if (habitTargetQuantityInput) habitTargetQuantityInput.value = '';
    if (habitStartDateInput) habitStartDateInput.value = getTodayIso();
    if (habitRemindEnable) habitRemindEnable.checked = true;
    if (habitRemindTime) habitRemindTime.value = '08:00';
    if (habitStatus) {
      habitStatus.style.display = 'none';
      habitStatus.textContent = '';
      habitStatus.className = 'form-status';
    }
    habitModal.classList.add('is-open');
    setTimeout(() => habitNameInput?.focus(), 80);
  };

  const closeHabitModal = () => {
    if (habitModal) habitModal.classList.remove('is-open');
    if (habitForm) habitForm.reset();
  };

  if (openAddBtn) openAddBtn.addEventListener('click', openAddModal);
  document.querySelectorAll('[data-open-add-habit]').forEach(btn => {
    if (btn !== openAddBtn) btn.addEventListener('click', openAddModal);
  });
  if (closeHabitBtn) closeHabitBtn.addEventListener('click', closeHabitModal);
  if (cancelHabitBtn) cancelHabitBtn.addEventListener('click', closeHabitModal);

  if (habitModal) {
    habitModal.addEventListener('click', (e) => {
      if (e.target === habitModal) closeHabitModal();
    });
  }

  if (habitForm) {
    habitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = habitNameInput?.value.trim();
      if (!name || name.length < 2) {
        if (habitStatus) {
          habitStatus.textContent = 'Please enter a habit name (at least 2 characters).';
          habitStatus.className = 'form-status show error';
          habitStatus.style.display = 'block';
        }
        habitNameInput?.focus();
        return;
      }

      let scheduledDays = null;
      const freqVal = habitFreqSelect?.value || 'Every day';
      if (freqVal === 'Custom recurring schedule') {
        const checkedDays = Array.from(document.querySelectorAll('#customDaysGrid input[type="checkbox"]:checked')).map(cb => cb.value);
        scheduledDays = checkedDays.length > 0 ? checkedDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      } else {
        scheduledDays = getScheduledDaysForFrequency(freqVal);
      }

      const editId = habitEditIdInput?.value;
      const payload = {
        name,
        description: habitDescInput?.value.trim() || '',
        category: habitCatSelect?.value || 'General',
        frequency: freqVal,
        scheduled_days: scheduledDays,
        target_quantity: habitTargetQuantityInput?.value.trim() || null,
        start_date: habitStartDateInput?.value || getTodayIso(),
        reminder_enabled: Boolean(habitRemindEnable?.checked),
        reminder_time: habitRemindTime?.value || '08:00'
      };

      if (saveHabitBtn) {
        saveHabitBtn.disabled = true;
        saveHabitBtn.innerHTML = '<span class="spinner"></span> <span>Saving...</span>';
      }

      try {
        if (editId) {
          await updateHabit(editId, payload);
          showToast('Habit updated successfully', 'success');
        } else {
          await createHabit(payload);
          showToast('Habit added successfully', 'success');
        }
        closeHabitModal();
      } catch (err) {
        if (habitStatus) {
          habitStatus.textContent = err.message || 'Failed to save habit. Please try again.';
          habitStatus.className = 'form-status show error';
          habitStatus.style.display = 'block';
        }
      } finally {
        if (saveHabitBtn) {
          saveHabitBtn.disabled = false;
          saveHabitBtn.textContent = editId ? 'Save Changes' : 'Save Habit';
        }
      }
    });
  }

  const closeDeleteModal = () => {
    if (deleteModal) deleteModal.classList.remove('is-open');
    if (deleteHabitIdInput) deleteHabitIdInput.value = '';
  };

  if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', closeDeleteModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  if (archiveHabitModalBtn) {
    archiveHabitModalBtn.addEventListener('click', async () => {
      const habitId = deleteHabitIdInput?.value;
      if (!habitId) return;
      archiveHabitModalBtn.disabled = true;
      try {
        await archiveHabit(habitId);
        closeDeleteModal();
      } catch (err) {
        showToast(err.message || 'Failed to archive habit', 'error');
      } finally {
        archiveHabitModalBtn.disabled = false;
      }
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      const habitId = deleteHabitIdInput?.value;
      if (!habitId) return;

      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.innerHTML = '<span class="spinner"></span> <span>Deleting...</span>';

      try {
        await deleteHabit(habitId, true);
        showToast('Habit deleted permanently', 'success');
        closeDeleteModal();
      } catch (err) {
        showToast(err.message || 'Failed to delete habit', 'error');
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Delete Habit';
      }
    });
  }
}

/**
 * Bind Search, Filter Pills, Sort Select, and View Tabs
 */
export function bindHabitControls() {
  const searchInput = document.getElementById('habitSearchInput');
  const sortSelect = document.getElementById('habitSortSelect');
  const viewTabActive = document.getElementById('viewTabActive');
  const viewTabArchived = document.getElementById('viewTabArchived');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      habitSearchQuery = searchInput.value.trim().toLowerCase();
      renderHabitsGrid();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      habitSortOrder = sortSelect.value;
      renderHabitsGrid();
    });
  }

  document.querySelectorAll('.status-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeStatusFilter = pill.dataset.status || 'all';
      renderHabitsGrid();
    });
  });

  if (viewTabActive && viewTabArchived) {
    viewTabActive.addEventListener('click', () => {
      viewTabActive.classList.add('active');
      viewTabActive.setAttribute('aria-selected', 'true');
      viewTabArchived.classList.remove('active');
      viewTabArchived.setAttribute('aria-selected', 'false');
      currentHabitView = 'active';
      renderHabitsGrid();
    });

    viewTabArchived.addEventListener('click', () => {
      viewTabArchived.classList.add('active');
      viewTabArchived.setAttribute('aria-selected', 'true');
      viewTabActive.classList.remove('active');
      viewTabActive.setAttribute('aria-selected', 'false');
      currentHabitView = 'archived';
      renderHabitsGrid();
    });
  }
}

/**
 * Bind Daily Reflection Modal
 */
export function bindDailyReflectionModal() {
  const modal = document.getElementById('dailyReflectionModal');
  const form = document.getElementById('dailyReflectionForm');
  const openBtn = document.getElementById('openDailyReflectionBtn');
  const closeBtn = document.getElementById('closeReflectionModalBtn');
  const cancelBtn = document.getElementById('cancelReflectionBtn');
  const dateInput = document.getElementById('reflectionDateInput');
  const dateLabel = document.getElementById('reflectionModalDate');
  const wentWellInput = document.getElementById('reflWentWell');
  const struggledInput = document.getElementById('reflStruggled');
  const improveInput = document.getElementById('reflImprove');
  const statusEl = document.getElementById('reflectionStatus');
  const saveBtn = document.getElementById('saveReflectionBtn');

  window.openDailyReflectionModal = function(dateIso = null) {
    const targetDate = dateIso || getTodayIso();
    if (dateInput) dateInput.value = targetDate;
    if (dateLabel) {
      const d = new Date(targetDate + 'T00:00:00');
      dateLabel.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }

    const existing = dailyReflections.find(r => r.reflection_date === targetDate);
    if (wentWellInput) wentWellInput.value = existing?.went_well || '';
    if (struggledInput) struggledInput.value = existing?.struggled_with || '';
    if (improveInput) improveInput.value = existing?.improve_tomorrow || '';

    if (statusEl) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
      statusEl.className = 'form-status';
    }

    if (modal) modal.classList.add('is-open');
    setTimeout(() => wentWellInput?.focus(), 80);
  };

  const closeModal = () => {
    if (modal) modal.classList.remove('is-open');
  };

  if (openBtn) openBtn.addEventListener('click', () => window.openDailyReflectionModal());
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetDate = dateInput?.value || getTodayIso();
      const wentWell = wentWellInput?.value || '';
      const struggled = struggledInput?.value || '';
      const improve = improveInput?.value || '';

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> <span>Saving...</span>';
      }

      try {
        await saveDailyReflection(targetDate, wentWell, struggled, improve);
        showToast('Daily reflection saved successfully', 'success');
        closeModal();
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = err.message || 'Failed to save reflection';
          statusEl.className = 'form-status show error';
          statusEl.style.display = 'block';
        }
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Reflection';
        }
      }
    });
  }
}

/**
 * Bind Weekly Review Modal
 */
export function bindWeeklyReviewModal() {
  const modal = document.getElementById('weeklyReviewModal');
  const openBtn = document.getElementById('openWeeklyReviewBtn');
  const bannerBtn = document.getElementById('viewFullWeeklyReviewBtn');
  const closeBtn = document.getElementById('closeWeeklyReviewModalBtn');
  const doneBtn = document.getElementById('closeWeeklyReviewDoneBtn');

  const openModal = () => {
    if (modal) modal.classList.add('is-open');
  };

  const closeModal = () => {
    if (modal) modal.classList.remove('is-open');
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (bannerBtn) bannerBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (doneBtn) doneBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

/**
 * Bind Calendar Navigation (Previous & Next Month, Day Selection)
 */
export function bindCalendarNavigation() {
  const prevBtn = document.getElementById('calPrevMonthBtn');
  const nextBtn = document.getElementById('calNextMonthBtn');
  const daysGrid = document.getElementById('calendarDaysGrid');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentCalMonth--;
      if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
      }
      renderCalendarSection();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCalMonth++;
      if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
      }
      renderCalendarSection();
    });
  }

  if (daysGrid) {
    daysGrid.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-date]');
      if (!cell) return;
      selectedCalDate = cell.dataset.date;
      renderCalendarSection();
    });
  }
}

/**
 * Bind Data Export Buttons
 */
export function bindDataExport() {
  const jsonBtn = document.getElementById('exportJsonBtn');
  const csvBtn = document.getElementById('exportCsvBtn');

  if (jsonBtn) jsonBtn.addEventListener('click', () => exportUserData('json'));
  if (csvBtn) csvBtn.addEventListener('click', () => exportUserData('csv'));
}

/**
 * Navigation System: Restored original toolbar and left-side slide-out account panel
 */
function bindNavigationSystem() {
  const userMenuBtn = document.getElementById('userMenuBtn');
  const accountSlidePanel = document.getElementById('accountSlidePanel');
  const accountPanelBackdrop = document.getElementById('accountPanelBackdrop');
  const closeAccountPanelBtn = document.getElementById('closeAccountPanelBtn');
  const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');

  const openAccountPanel = () => {
    if (accountSlidePanel && accountPanelBackdrop) {
      accountSlidePanel.classList.add('is-open');
      accountPanelBackdrop.classList.add('is-open');
      accountSlidePanel.setAttribute('aria-hidden', 'false');
      accountPanelBackdrop.setAttribute('aria-hidden', 'false');
      userMenuBtn?.setAttribute('aria-expanded', 'true');
    }
  };

  const closeAccountPanel = () => {
    if (accountSlidePanel && accountPanelBackdrop) {
      accountSlidePanel.classList.remove('is-open');
      accountPanelBackdrop.classList.remove('is-open');
      accountSlidePanel.setAttribute('aria-hidden', 'true');
      accountPanelBackdrop.setAttribute('aria-hidden', 'true');
      userMenuBtn?.setAttribute('aria-expanded', 'false');
    }
  };

  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = accountSlidePanel?.classList.contains('is-open');
      if (isOpen) {
        closeAccountPanel();
      } else {
        openAccountPanel();
      }
    });
  }

  if (closeAccountPanelBtn) {
    closeAccountPanelBtn.addEventListener('click', closeAccountPanel);
  }

  if (accountPanelBackdrop) {
    accountPanelBackdrop.addEventListener('click', closeAccountPanel);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && accountSlidePanel?.classList.contains('is-open')) {
      closeAccountPanel();
    }
  });

  if (accountSlidePanel) {
    accountSlidePanel.querySelectorAll('.account-panel-item').forEach(item => {
      item.addEventListener('click', () => {
        closeAccountPanel();
      });
    });
  }

  const handleSignOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      showToast('Signing out...', 'info');
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    window.location.replace('habitflow_auth.html');
  };

  if (logoutDropdownBtn) {
    logoutDropdownBtn.addEventListener('click', handleSignOut);
  }

  // Category filter tabs
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.category || 'All';
      renderHabitsGrid();
    });
  });

  // Habit card interactive clicks
  const habitsContainer = document.getElementById('habitsContainer');
  if (habitsContainer) {
    habitsContainer.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      const habitId = target.dataset.habitId;

      if (action === 'toggle-checkin') {
        await toggleHabitCheckIn(habitId, target);
      } else if (action === 'open-habit-reminder') {
        openRemindersModal(habitId);
      } else if (action === 'edit-habit') {
        openEditHabitModal(habitId);
      } else if (action === 'delete-habit') {
        openDeleteHabitModal(habitId);
      } else if (action === 'restore-habit') {
        await unarchiveHabit(habitId);
      }
    });
  }
}

/**
 * Dedicated Preferences & Appearance Modal
 * Directly accessible from main navigation on Desktop and Mobile
 */
function bindPreferencesModal() {
  const prefModal = document.getElementById('preferencesModal');
  const openPrefBtns = document.querySelectorAll('[data-open-preferences]');
  const closePrefBtn = document.getElementById('closePrefModalBtn');
  const themeSelect = document.getElementById('prefThemeSelect');
  const timezoneSelect = document.getElementById('prefTimezoneSelect');
  const weekStartSelect = document.getElementById('prefWeekStartSelect');
  const notifBtn = document.getElementById('prefNotifBtn');
  const notifStatusLabel = document.getElementById('prefNotifStatusLabel');

  const openModal = () => {
    document.getElementById('accountSlidePanel')?.classList.remove('is-open');
    document.getElementById('accountPanelBackdrop')?.classList.remove('is-open');
    if (prefModal) prefModal.classList.add('is-open');
  };

  const closeModal = () => {
    if (prefModal) prefModal.classList.remove('is-open');
  };

  openPrefBtns.forEach(btn => btn.addEventListener('click', openModal));
  if (closePrefBtn) closePrefBtn.addEventListener('click', closeModal);
  if (prefModal) {
    prefModal.addEventListener('click', (e) => {
      if (e.target === prefModal) closeModal();
    });
  }

  if (themeSelect) {
    themeSelect.value = getStoredTheme();
    themeSelect.addEventListener('change', () => {
      setTheme(themeSelect.value);
      showToast(`Theme updated to ${themeSelect.value}`, 'success');
    });
  }

  const currentAccent = getStoredAccent();
  document.querySelectorAll('#prefAccentPickerGrid .accent-pill-btn').forEach(btn => {
    if (btn.dataset.accent === currentAccent) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('#prefAccentPickerGrid .accent-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setAccent(btn.dataset.accent);
      showToast(`Accent palette updated to ${ACCENTS[btn.dataset.accent]?.name || btn.dataset.accent}`, 'success');
    });
  });

  const savedTz = localStorage.getItem('habitflow_timezone') || 'auto';
  if (timezoneSelect) {
    timezoneSelect.value = savedTz;
    timezoneSelect.addEventListener('change', async () => {
      const val = timezoneSelect.value;
      localStorage.setItem('habitflow_timezone', val);
      const supabase = getSupabase();
      if (supabase && currentUser) {
        await supabase.from('profiles').update({ timezone_preference: val }).eq('id', currentUser.id);
      }
      showToast(`Timezone preference saved (${val})`, 'success');
    });
  }

  const savedWeekStart = localStorage.getItem('habitflow_week_start') || 'Mon';
  if (weekStartSelect) {
    weekStartSelect.value = savedWeekStart;
    weekStartSelect.addEventListener('change', async () => {
      const val = weekStartSelect.value;
      localStorage.setItem('habitflow_week_start', val);
      const supabase = getSupabase();
      if (supabase && currentUser) {
        await supabase.from('profiles').update({ week_start_preference: val }).eq('id', currentUser.id);
      }
      showToast(`Week start set to ${val === 'Mon' ? 'Monday' : 'Sunday'}`, 'success');
    });
  }

  updateNotificationStatus(notifBtn, notifStatusLabel);
  if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
      await requestNotificationPermission(notifBtn, notifStatusLabel);
    });
  }
}

/**
 * Reminders Management Modal
 */
function bindRemindersModal() {
  const modal = document.getElementById('remindersModal');
  const openBtns = document.querySelectorAll('[data-open-reminders]');
  const closeBtn = document.getElementById('closeRemindersModalBtn');
  const doneBtn = document.getElementById('closeRemindersDoneBtn');

  const openModal = () => {
    document.getElementById('mobileNavDrawer')?.classList.remove('is-open');
    renderRemindersList();
    if (modal) modal.classList.add('is-open');
  };

  const closeModal = () => {
    if (modal) modal.classList.remove('is-open');
  };

  openBtns.forEach(btn => btn.addEventListener('click', openModal));
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (doneBtn) doneBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

export function openRemindersModal(focusHabitId = null) {
  const modal = document.getElementById('remindersModal');
  renderRemindersList(focusHabitId);
  if (modal) modal.classList.add('is-open');
}

export function renderRemindersList(highlightId = null) {
  const container = document.getElementById('remindersListContainer');
  if (!container) return;

  const activeHabits = userHabits.filter(h => !h.is_archived);

  if (activeHabits.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px">No active routines configured for reminders.</p>`;
    return;
  }

  container.innerHTML = activeHabits.map(habit => {
    const isHighlight = habit.id === highlightId;
    return `
      <div class="reminder-item-card ${isHighlight ? 'highlighted' : ''}" data-habit-id="${habit.id}">
        <div class="reminder-item-info">
          <div class="reminder-item-name">${escapeHtml(habit.name)}</div>
          <div class="reminder-item-meta">
            <span>${escapeHtml(habit.category || 'General')}</span>
            <span style="opacity:0.3">•</span>
            <span>${escapeHtml(habit.frequency || 'Every day')}</span>
          </div>
        </div>
        <div class="reminder-item-controls">
          <input type="time"
                 class="reminder-time-input"
                 value="${habit.reminder_time || '08:00'}"
                 data-habit-id="${habit.id}"
                 aria-label="Reminder time for ${escapeHtml(habit.name)}" />
          <label class="check" style="font-size:11.5px;margin:0" title="Toggle reminder">
            <input type="checkbox"
                   class="reminder-enable-check"
                   data-habit-id="${habit.id}"
                   ${habit.reminder_enabled !== false ? 'checked' : ''} />
            <span>Active</span>
          </label>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.reminder-time-input').forEach(input => {
    input.addEventListener('change', async () => {
      const habitId = input.dataset.habitId;
      const newTime = input.value;
      await updateHabitReminder(habitId, { reminder_time: newTime });
    });
  });

  container.querySelectorAll('.reminder-enable-check').forEach(chk => {
    chk.addEventListener('change', async () => {
      const habitId = chk.dataset.habitId;
      const enabled = chk.checked;
      await updateHabitReminder(habitId, { reminder_enabled: enabled });
    });
  });
}

export async function updateHabitReminder(habitId, patch) {
  const habit = userHabits.find(h => h.id === habitId);
  if (!habit) return;

  Object.assign(habit, patch);
  const supabase = getSupabase();
  if (supabase && currentUser) {
    try {
      await supabase
        .from('habits')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', habitId)
        .eq('user_id', currentUser.id);
      showToast(`Reminder settings updated for ${habit.name}`, 'success');
      renderDashboard();
    } catch (e) {
      console.warn('Reminder update error:', e.message);
    }
  }
}

/**
 * Settings Modal & Security Password Verification Flow
 */
function bindSettingsModal() {
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtns = document.querySelectorAll('[data-open-settings]');
  const closeSettingsBtn = document.getElementById('closeSettingsModalBtn');
  const updateProfileForm = document.getElementById('updateProfileForm');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const statusEl = document.getElementById('changePasswordStatus');

  const openModal = () => {
    document.getElementById('accountSlidePanel')?.classList.remove('is-open');
    document.getElementById('accountPanelBackdrop')?.classList.remove('is-open');
    if (settingsModal) settingsModal.classList.add('is-open');
  };

  const closeModal = () => {
    if (settingsModal) settingsModal.classList.remove('is-open');
    if (changePasswordForm) {
      changePasswordForm.reset();
      resetPasswordToggles();
    }
    if (statusEl) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
      statusEl.className = 'form-status';
    }
  };

  openSettingsBtns.forEach(btn => btn.addEventListener('click', openModal));
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeModal);
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeModal();
    });
  }

  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.toggle;
      const input = document.getElementById(targetId);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? ICONS.eyeOff : ICONS.eye;
        btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      }
    });
  });

  if (updateProfileForm) {
    updateProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('settingsFullName')?.value.trim();
      if (!newName || newName.length < 2) {
        showToast('Display name must be at least 2 characters', 'error');
        return;
      }

      const submitBtn = updateProfileForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> <span>Updating...</span>';
      const supabase = getSupabase();

      try {
        await supabase.auth.updateUser({
          data: { full_name: newName, name: newName }
        });

        await supabase
          .from('profiles')
          .update({ full_name: newName, updated_at: new Date().toISOString() })
          .eq('id', currentUser.id);

        if (currentProfile) currentProfile.full_name = newName;
        updateGreetingDisplay(newName, currentUser.email || '');

        showToast('Profile name updated successfully', 'success');
      } catch (err) {
        showToast(formatAuthError(err), 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Name';
      }
    });
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassInput = document.getElementById('settingsCurrentPassword');
      const newPassInput = document.getElementById('settingsNewPassword');
      const confirmPassInput = document.getElementById('settingsConfirmPassword');
      const submitBtn = document.getElementById('changePasswordSubmitBtn');

      const currentPassword = currentPassInput?.value || '';
      const newPassword = newPassInput?.value || '';
      const confirmPassword = confirmPassInput?.value || '';

      const setStatus = (message, isError = true) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = isError ? 'form-status error' : 'form-status success';
        statusEl.style.display = 'block';
      };

      if (!statusEl) return;
      statusEl.style.display = 'none';

      if (!currentPassword) {
        setStatus('Please enter your current password.');
        currentPassInput?.focus();
        return;
      }

      if (!newPassword) {
        setStatus('Please enter your new password.');
        newPassInput?.focus();
        return;
      }

      if (newPassword.length < 8) {
        setStatus('Password must be at least 8 characters long.');
        newPassInput?.focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        setStatus('Your new passwords do not match.');
        confirmPassInput?.focus();
        return;
      }

      if (newPassword === currentPassword) {
        setStatus('Your new password must be different from your current password.');
        newPassInput?.focus();
        return;
      }

      const supabase = getSupabase();
      if (!supabase || !currentUser?.email) {
        setStatus('Authentication session error. Please refresh and try again.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> <span>Verifying...</span>';

      try {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword
        });

        if (verifyError) {
          setStatus('Your current password is incorrect. Please try again.', true);
          showToast('Your current password is incorrect. Please try again.', 'error');
          currentPassInput.focus();
          return;
        }

        submitBtn.innerHTML = '<span class="spinner"></span> <span>Updating password...</span>';
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          throw updateError;
        }

        setStatus('Your password has been changed successfully.', false);
        showToast('Your password has been changed successfully.', 'success');

        changePasswordForm.reset();
        resetPasswordToggles();
      } catch (err) {
        console.error('Password change error:', err);
        setStatus('Unable to update password. Please try again.', true);
        showToast('Unable to update password. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change Password';
      }
    });
  }
}

function resetPasswordToggles() {
  document.querySelectorAll('#changePasswordForm .password-input').forEach(input => {
    input.type = 'password';
  });
  document.querySelectorAll('#changePasswordForm [data-toggle]').forEach(btn => {
    btn.innerHTML = ICONS.eye;
    btn.setAttribute('aria-label', 'Show password');
  });
}

function updateNotificationStatus(btn, label) {
  if (!('Notification' in window)) {
    if (label) label.textContent = 'Not supported in this browser';
    if (btn) btn.style.display = 'none';
    return;
  }

  if (Notification.permission === 'granted') {
    if (label) label.textContent = 'Alerts are active';
    if (btn) {
      btn.textContent = 'Active';
      btn.disabled = true;
    }
  } else if (Notification.permission === 'denied') {
    if (label) label.textContent = 'Blocked in browser permissions';
    if (btn) {
      btn.textContent = 'Blocked';
      btn.disabled = true;
    }
  } else {
    if (label) label.textContent = 'Permission needed for alerts';
    if (btn) {
      btn.textContent = 'Enable Alerts';
      btn.disabled = false;
    }
  }
}

async function requestNotificationPermission(btn, label) {
  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported on this device.', 'info');
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    updateNotificationStatus(btn, label);
    if (permission === 'granted') {
      showToast('Browser notifications enabled successfully.', 'success');
      new Notification('HabitFlow Alerts', {
        body: 'You will receive reminders for scheduled habits.',
        icon: 'favicon.svg'
      });
    } else {
      showToast('Notification permission was not granted.', 'info');
    }
  } catch (e) {
    console.warn('Notification permission error:', e);
  }
}

function startReminderWorker() {
  if (reminderIntervalId) clearInterval(reminderIntervalId);
  checkDueReminders();
  reminderIntervalId = setInterval(checkDueReminders, 30000);
}

function checkDueReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;
  const todayIso = getTodayIso();

  const todayCompletedHabitIds = new Set(
    habitCompletions.filter(c => c.completed_date === todayIso).map(c => c.habit_id)
  );

  userHabits.forEach(habit => {
    if (!habit.reminder_enabled || !habit.reminder_time || habit.is_archived) return;

    if (todayCompletedHabitIds.has(habit.id)) return;

    const reminderKey = `${todayIso}-${habit.id}-${habit.reminder_time}`;
    if (remindedTodaySet.has(reminderKey)) return;

    if (habit.reminder_time === currentTime) {
      remindedTodaySet.add(reminderKey);
      try {
        new Notification(`Habit Reminder: ${habit.name}`, {
          body: habit.description || 'Time for your daily routine check-in on HabitFlow.',
          icon: 'favicon.svg'
        });
      } catch (err) {
        console.warn('Notification display failed:', err);
      }
    }
  });
}
