/**
 * HabitFlow — Automated Application Screenshot Capture Suite
 * Captures 7 authentic screenshots directly from the running HabitFlow application
 * using Microsoft Edge headless rendering with precise viewport dimensions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWS = [
  {
    filename: '01-login-auth.png',
    title: '1. Login & Sign Up (Authentication Portal)',
    url: 'http://localhost:3000/habitflow_auth.html',
    width: 1280,
    height: 820
  },
  {
    filename: '02-main-dashboard.png',
    title: '2. Main Dashboard (Personalized Overview & Progress)',
    url: 'http://localhost:3000/dashboard.html?demo=true',
    width: 1280,
    height: 860
  },
  {
    filename: '03-daily-habits.png',
    title: '3. Daily Habits (Predefined Routines, Filters & Checklists)',
    url: 'http://localhost:3000/dashboard.html?demo=true&focus=habits',
    width: 1280,
    height: 860
  },
  {
    filename: '04-calendar-history.png',
    title: '4. Calendar & Completion History (Interactive Matrix & Day Details)',
    url: 'http://localhost:3000/dashboard.html?demo=true&focus=calendar',
    width: 1280,
    height: 860
  },
  {
    filename: '05-statistics-analytics.png',
    title: '5. Statistics & Analytics (Completion Rates, Streaks & Insights)',
    url: 'http://localhost:3000/dashboard.html?demo=true&focus=analytics',
    width: 1280,
    height: 860
  },
  {
    filename: '06-preferences-appearance.png',
    title: '6. Preferences & Appearance (Theme Modes & Accent Palette)',
    url: 'http://localhost:3000/dashboard.html?demo=true&open=preferences',
    width: 1280,
    height: 860
  },
  {
    filename: '07-habit-management.png',
    title: '7. Habit Management & Reminders (Add / Edit Habit Modal)',
    url: 'http://localhost:3000/dashboard.html?demo=true&open=add-habit',
    width: 1280,
    height: 880
  }
];

async function captureAll() {
  console.log('=== Starting HabitFlow Screenshot Capture ===\n');

  const results = [];

  for (const view of VIEWS) {
    const outPath = path.join(SCREENSHOTS_DIR, view.filename);
    console.log(`Capturing: ${view.title}...`);
    console.log(`  Target: ${view.url}`);

    const cmd = `"${EDGE_PATH}" --headless --disable-gpu --virtual-time-budget=2500 --window-size=${view.width},${view.height} --screenshot="${outPath}" "${view.url}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      if (fs.existsSync(outPath)) {
        const stat = fs.statSync(outPath);
        console.log(`  -> SUCCESS: Saved ${view.filename} (${(stat.size / 1024).toFixed(1)} KB)\n`);
        results.push({ ...view, sizeKb: (stat.size / 1024).toFixed(1), path: outPath, success: true });
      } else {
        console.error(`  -> FAILED: File not generated for ${view.filename}\n`);
        results.push({ ...view, success: false });
      }
    } catch (err) {
      console.error(`  -> ERROR capturing ${view.filename}:`, err.message, '\n');
      results.push({ ...view, success: false, error: err.message });
    }
  }

  console.log('=============================================');
  console.log(`Screenshot capture completed: ${results.filter(r => r.success).length}/${VIEWS.length} successful.`);
  console.log('=============================================');
}

captureAll();
