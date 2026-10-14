# HabitFlow — Progressive Web App Habit Tracker

A modern, responsive, and privacy-first habit tracking Progressive Web App (PWA) built with vanilla JavaScript, modern CSS, and Supabase. HabitFlow features daily routine tracking, schedule-aware streaks, weekly analytics, daily reflections, multi-platform PWA installation, and comprehensive user authentication.

Created by **Hazim Bashir (حازم بشیر)** — `@officialhazim42`.

---

## Key Features

- **Progressive Web App (PWA) Support**:
  - Installable on **Desktop** (Chrome, Edge, Brave), **Android** (Chrome, Samsung Internet), and **iPhone & iPad** (Safari Add to Home Screen).
  - Offline-first Service Worker caching static assets and pages.
  - Interactive, multi-platform installation guide with back navigation and modal controls.
  - Web App Manifest configured with adaptive maskable icons.
- **Habit Tracking & Management**:
  - 9 pre-configured starter habits provisioned automatically for new accounts.
  - Create, edit, and archive custom habits with target daily goals and customizable schedules.
  - Schedule-aware streak calculation preserving momentum across non-scheduled days.
  - Real-time search, filter pills, and sorting controls.
- **Analytics & Reflections**:
  - Weekly momentum review and completion rate visualizations.
  - Interactive calendar completion drawer and history logs.
  - Daily reflections modal for mindfulness notes and evening reviews.
  - One-click data export in both JSON and CSV formats.
- **Enterprise-Grade Security & Authentication**:
  - Powered by Supabase Auth with Row Level Security (RLS) PostgreSQL policies.
  - Email & Password authentication with real-time validation and strength indicators.
  - Social OAuth integration supporting Google and Facebook.
  - 3-step secure password recovery flow.
  - Zero hardcoded secrets; frontend uses strictly public anonymous tokens.
- **Design System & Craftsmanship**:
  - Signature dark SaaS palette: Deep Navy (`#0b1220`, `#111b2b`, `#162235`) with emerald green accents (`#9be15d`, `#63d6bd`).
  - Strict zero-emoji compliance using crisp, scalable inline Lucide-style SVGs.
  - Responsive layouts tailored for mobile, tablet, and widescreen desktop monitors.
  - Interactive About Developer modal highlighting Hazim Bashir (حازم بشیر) with 10 social platform links.

---

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+ Modules), HTML5 Semantic Architecture, Vanilla CSS (CSS Variables, Flexbox, Grid).
- **Icons**: Custom inline SVG icons (Lucide-inspired).
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth GoTrue).
- **PWA & Offline**: W3C Web App Manifest (`manifest.webmanifest`), Service Worker API (`Cache-First` / `Network-First` strategy).
- **Local Server**: Lightweight, zero-dependency Node.js HTTP server (`server.js`).

---

## Project Structure

```
HabitFlow/
├── index.html                  # Root router checking auth sessions
├── habitflow_auth.html         # Login, Registration, and OAuth portal
├── dashboard.html              # Main habit dashboard, analytics, reflections
├── reset-password.html         # Secure password recovery interface
├── server.js                   # Development HTTP server with API endpoints
├── package.json                # Project scripts, metadata, and dependencies
├── .gitignore                  # Git exclusion rules for secrets and build artifacts
├── .env.example                # Configuration template with placeholder credentials
├── manifest.webmanifest        # PWA Web App Manifest
├── manifest.json               # Manifest fallback alias
├── sw.js                       # Service Worker for offline caching
├── generate_pwa_icons.js       # Script generating standard and maskable app icons
├── README.md                   # Documentation and deployment manual
├── assets/
│   ├── css/
│   │   ├── styles.css          # Design tokens, global PWA modal system, toasts
│   │   ├── auth.css            # Authentication form layouts and responsive styles
│   │   ├── dashboard.css       # Habit cards, analytics charts, calendar drawer
│   │   └── developer-modal.css # Developer profile modal and social links grid
│   ├── js/
│   │   ├── config.js           # Runtime configuration and credential manager
│   │   ├── supabase-client.js  # Supabase client initialization & OAuth handlers
│   │   ├── auth.js             # Authentication form lifecycle controller
│   │   ├── dashboard.js        # Habit CRUD, completions, reflections, and stats
│   │   ├── validation.js       # Input validators and security checks
│   │   ├── pwa.js              # PWA manager and multi-platform install guide
│   │   ├── profile.js          # Developer profile modal interactions
│   │   ├── theme.js            # Theme switching and storage persistence
│   │   └── reset-password.js   # Recovery token and password update controller
│   └── icons/                  # 192px, 512px, maskable, and Apple touch icons
├── pages/
│   ├── privacy.html            # Transparent privacy policy
│   └── terms.html              # Terms of Service
└── supabase/
    └── schema.sql              # PostgreSQL schema, RLS policies & automatic triggers
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or newer recommended)
- A modern web browser (Google Chrome, Microsoft Edge, Safari, or Mozilla Firefox)

### Installation & Local Run

1. Clone the repository:
   ```bash
   git clone https://github.com/officialhazim42/HabitFlow.git
   cd HabitFlow
   ```

2. Start the local development server:
   ```bash
   npm start
   # or: node server.js
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000/
   ```

---

## Environment & Supabase Setup

HabitFlow works immediately with client-side credential configuration or environment variables.

### 1. Configure Supabase Project

1. Create a free project at [Supabase](https://supabase.com/).
2. In the Supabase Dashboard, open the **SQL Editor**, paste the contents of `supabase/schema.sql`, and run the script. This provisions:
   - `profiles`, `habits`, and `habit_completions` tables.
   - Strict Row Level Security (RLS) guaranteeing user data privacy.
   - Triggers for automatic user profile initialization.
3. Retrieve your **Project URL** and **Anon Public Key** from **Project Settings → API**.

### 2. Configure Credentials

Copy `.env.example` to `.env` or connect via the in-app Developer Connection banner:
```bash
cp .env.example .env
```

```ini
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here"
AUTH_REDIRECT_URL="http://localhost:3000/dashboard.html"
```

> **Security Note**: Never expose your `SUPABASE_SERVICE_ROLE_KEY` in frontend code. HabitFlow operates entirely with the public anonymous key protected by database-level RLS policies.

### 3. OAuth Provider Setup (Optional)

- **Google OAuth**:
  - In Google Cloud Console, create an OAuth 2.0 Web Client.
  - Set Authorized redirect URI: `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
  - In Supabase Dashboard (**Authentication → Providers → Google**), paste Client ID and Secret.
- **Facebook OAuth**:
  - In Meta for Developers, create an app and add Facebook Login.
  - Set Valid OAuth Redirect URI: `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
  - In Supabase Dashboard (**Authentication → Providers → Facebook**), paste App ID and Secret.

---

## Verification & Testing

The project includes automated regression test suites covering PWA behavior, authentication safety, DOM interactions, and dashboard logic.

Run the test suite:
```bash
# Run core test suite and PWA verification
npm test

# Run all verification suites
npm run test:all
```

Verification test coverage includes:
- `test_suite.js`: Authentication, password reset flow, layout restoration, 10 platforms.
- `verify_pwa.js`: Web App Manifest, icon integrity, service worker caching, zero emojis.
- `test_interactive_guide.js`: Multi-platform installation guide modal navigation, Got It / Close (X) buttons, form preservation.
- `verify_dashboard_logic.js`: 9 starter habits, custom habit lifecycle, idempotency.
- `verify_full_integration.js`: Preferences toolbar, account panel, user isolation.
- `verify_advanced_features.js`: Streaks, search/filters, reflections, analytics, export.

---

## Deployment Guidelines

### Static & JAMstack Hosting (Vercel, Netlify, Cloudflare Pages)

HabitFlow is fully compatible with static hosting providers:
- **Build Command**: Leave blank (no compilation required).
- **Publish Directory**: Root (`./`)
- **Headers**: Ensure `Service-Worker-Allowed: /` header is permitted for `/sw.js`.

### GitHub Pages

To deploy on GitHub Pages:
- Ensure paths in `manifest.webmanifest` and service worker registrations account for repository subpaths if not using a custom domain.

---

## About the Creator

**Hazim Bashir (حازم بشیر)**  
Independent Software Creator & Android Developer  
Ganderbal, Jammu & Kashmir, India  
- **GitHub**: [@officialhazim42](https://github.com/officialhazim42)  
- **Email**: [hazimbashirfaqeer@gmail.com](mailto:hazimbashirfaqeer@gmail.com)  
- **LinkedIn**: [hazim-bashir-faqeer](https://www.linkedin.com/in/hazim-bashir-faqeer)  
- **X / Twitter**: [@officialhazim42](https://x.com/officialhazim42)  

---

*Crafted with precision by Hazim Bashir (حازم بشیر).*
