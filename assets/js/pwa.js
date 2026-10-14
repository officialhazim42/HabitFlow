/**
 * HabitFlow — Progressive Web App (PWA) Manager
 * Handles Service Worker registration, beforeinstallprompt lifecycle,
 * Multi-Platform Installation Guides (Desktop, Android, iOS), standalone mode detection,
 * reliable modal state handling, offline network status monitoring, and UI integration.
 * Strictly zero emojis — all icons rendered via inline SVG.
 */

// Local storage key for install dismissal cooldown (7 days)
const PWA_DISMISSED_KEY = 'habitflow_pwa_dismissed';
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Inline SVG Icons (Lucide-style)
const PWA_ICONS = {
  download: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  check: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  arrowLeft: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  chevronRight: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  share: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
  plusSquare: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  monitor: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  smartphone: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  tablet: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  info: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  wifiOff: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  wifi: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
};

class PwaManager {
  constructor() {
    this.deferredPrompt = null;
    this.swRegistration = null;
    this.isInstalled = false;
    this.currentGuideView = 'platforms';
    this.modalEl = null;
    this.init();
  }

  init() {
    this.isInstalled = this.detectInstalled();
    this.registerServiceWorker();
    this.setupInstallPromptListeners();
    this.setupNetworkMonitoring();
    this.setupInstalledAppListener();

    // When DOM is ready, initialize UI bindings
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initUI());
    } else {
      this.initUI();
    }
  }

  /**
   * Determine if the application is running in an installed standalone context
   */
  detectInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
      return true;
    }
    if (window.navigator.standalone === true) {
      return true;
    }
    if (document.referrer && document.referrer.includes('android-app://')) {
      return true;
    }
    return false;
  }

  /**
   * Detect if current platform is iOS (iPhone, iPad, iPod)
   */
  isIOS() {
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return (isAppleDevice || isIpadOS) && !window.MSStream;
  }

  /**
   * Detect if running in Safari on iOS
   */
  isIOSSafari() {
    if (!this.isIOS()) return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios');
  }

  /**
   * Register the service worker supporting root and subdirectory deployments
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const currentPath = window.location.pathname;
      const isSubpage = currentPath.includes('/pages/');
      const swUrl = isSubpage ? '../sw.js' : 'sw.js';
      const swScope = isSubpage ? '../' : './';

      const reg = await navigator.serviceWorker.register(swUrl, { scope: swScope });
      this.swRegistration = reg;

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[HabitFlow PWA] New version ready for activation');
            }
          });
        }
      });
    } catch (err) {
      console.warn('[HabitFlow PWA] Service Worker registration failed:', err);
    }
  }

  /**
   * Listen for browser beforeinstallprompt event
   */
  setupInstallPromptListeners() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;

      this.updateInstallButtons();

      if (this.shouldShowAutoBanner()) {
        setTimeout(() => {
          this.showInstallBanner();
        }, 3500);
      }
    });
  }

  /**
   * Listen for appinstalled event
   */
  setupInstalledAppListener() {
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallBanner();
      this.closeGuide();
      this.updateInstallButtons();
      this.showToast('HabitFlow installed successfully. You can now launch it from your home screen or application launcher.', 'success');
    });
  }

  /**
   * Check if auto install banner should be shown
   */
  shouldShowAutoBanner() {
    if (this.isInstalled) return false;
    if (!this.deferredPrompt) return false;

    // Only show on dashboard page (never disrupt on initial auth/login load)
    const isDashboard = window.location.pathname.includes('dashboard.html');
    if (!isDashboard) return false;

    const lastDismissed = localStorage.getItem(PWA_DISMISSED_KEY);
    if (lastDismissed) {
      const elapsed = Date.now() - parseInt(lastDismissed, 10);
      if (elapsed < DISMISSAL_COOLDOWN_MS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Initialize UI elements on page
   */
  initUI() {
    this.createBannerElements();
    this.createGuideModalElements();
    this.bindUIButtons();
    this.updateInstallButtons();
  }

  /**
   * Create install prompt banner DOM elements with 3 platform options
   */
  createBannerElements() {
    if (document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'pwa-install-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Install HabitFlow Application');
    banner.innerHTML = `
      <div class="pwa-banner-card">
        <div class="pwa-banner-top">
          <div class="pwa-banner-left">
            <div class="pwa-app-icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="36" height="36">
                <defs>
                  <linearGradient id="pwaHfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#9be15d" />
                    <stop offset="100%" stop-color="#63d6bd" />
                  </linearGradient>
                </defs>
                <rect width="64" height="64" rx="16" fill="#0b1220" />
                <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#pwaHfGrad)" />
                <g fill="#102014" transform="translate(32,32) scale(0.9)">
                  <rect x="-3" y="-16" width="6" height="32" rx="3" />
                  <rect x="-16" y="-3" width="32" height="6" rx="3" />
                  <rect x="-3" y="-16" width="6" height="32" rx="3" transform="rotate(45)" />
                  <rect x="-3" y="-16" width="6" height="32" rx="3" transform="rotate(-45)" />
                </g>
              </svg>
            </div>
            <div class="pwa-banner-text">
              <h3 class="pwa-banner-title">Install HabitFlow</h3>
              <p class="pwa-banner-desc">Install HabitFlow on your device for quick access to your daily habits and progress.</p>
            </div>
          </div>
          <div class="pwa-banner-actions">
            <button type="button" class="btn-secondary pwa-btn-dismiss" id="pwaBannerDismissBtn">
              Not Now
            </button>
            <button type="button" class="btn btn-primary pwa-btn-install" id="pwaBannerInstallBtn">
              ${PWA_ICONS.download}
              <span>Install App</span>
            </button>
          </div>
        </div>

        <!-- Three clearly identifiable installation guide options -->
        <div class="pwa-banner-options">
          <span class="pwa-banner-options-label">Installation Guides:</span>
          <div class="pwa-banner-options-btns">
            <button type="button" class="pwa-banner-guide-btn" data-open-platform-guide="desktop">
              ${PWA_ICONS.monitor}
              <span>Desktop</span>
            </button>
            <button type="button" class="pwa-banner-guide-btn" data-open-platform-guide="android">
              ${PWA_ICONS.smartphone}
              <span>Android</span>
            </button>
            <button type="button" class="pwa-banner-guide-btn" data-open-platform-guide="ios">
              ${PWA_ICONS.tablet}
              <span>iPhone & iPad</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwaBannerDismissBtn')?.addEventListener('click', () => {
      this.dismissBanner();
    });

    document.getElementById('pwaBannerInstallBtn')?.addEventListener('click', () => {
      this.handleUserInstallClick();
    });

    banner.querySelectorAll('[data-open-platform-guide]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const platform = btn.getAttribute('data-open-platform-guide');
        this.openGuide(platform);
      });
    });
  }

  /**
   * Create Full Multi-Platform Installation Guide Modal
   * Working Back, Got It, Close (X), Escape, and Backdrop controls across all pages.
   */
  createGuideModalElements() {
    if (document.getElementById('pwaGuideModal')) {
      this.modalEl = document.getElementById('pwaGuideModal');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'pwaGuideModal';
    modal.className = 'pwa-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'pwaGuideModalTitle');

    modal.innerHTML = `
      <div class="pwa-modal-dialog">
        <div class="pwa-modal-head">
          <div class="pwa-modal-title-wrap">
            <button type="button" class="pwa-guide-back-btn" id="pwaGuideBackBtn" aria-label="Back to installation options" style="display:none">
              ${PWA_ICONS.arrowLeft}
              <span>Back</span>
            </button>
            <h3 id="pwaGuideModalTitle" class="pwa-modal-title">Install HabitFlow</h3>
          </div>
          <button type="button" class="dev-modal-close" id="closePwaGuideModalBtn" aria-label="Close installation guide">
            ${PWA_ICONS.x}
          </button>
        </div>

        <div class="pwa-modal-body" id="pwaGuideModalBody">
          <!-- Populated dynamically via renderGuideView() -->
        </div>

        <div class="pwa-modal-foot">
          <button type="button" class="btn btn-primary" id="pwaGuideGotItBtn" style="padding:0 22px;height:38px">
            Got It
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    // Backward compatibility: also ensure #pwaIosModal exists as alias or pointer
    if (!document.getElementById('pwaIosModal')) {
      const alias = document.createElement('div');
      alias.id = 'pwaIosModal';
      alias.style.display = 'none';
      document.body.appendChild(alias);
    }

    // Attach Close (X) handler
    const closeBtn = document.getElementById('closePwaGuideModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeGuide();
      });
    }

    // Attach Got It button handler
    const gotItBtn = document.getElementById('pwaGuideGotItBtn');
    if (gotItBtn) {
      gotItBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeGuide();
      });
    }

    // Attach Back button handler
    const backBtn = document.getElementById('pwaGuideBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.renderGuideView('platforms');
      });
    }

    // Attach Backdrop click handler
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeGuide();
      }
    });

    // Attach Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl && this.modalEl.classList.contains('is-open')) {
        this.closeGuide();
      }
    });
  }

  /**
   * Render specific guide view ('platforms', 'desktop', 'android', 'ios')
   */
  renderGuideView(viewKey) {
    this.currentGuideView = viewKey;
    const body = document.getElementById('pwaGuideModalBody');
    const titleEl = document.getElementById('pwaGuideModalTitle');
    const backBtn = document.getElementById('pwaGuideBackBtn');

    if (!body || !titleEl || !backBtn) return;

    if (viewKey === 'platforms') {
      titleEl.textContent = 'Install HabitFlow';
      backBtn.style.display = 'none';

      body.innerHTML = `
        <p style="margin:0 0 12px 0;color:var(--text-primary);font-size:13.5px">
          Select your device or operating system to view step-by-step installation instructions:
        </p>

        <div class="pwa-platforms-grid">
          <!-- 1. Desktop Installation Card -->
          <button type="button" class="pwa-platform-card" data-select-guide="desktop">
            <div class="pwa-platform-icon" aria-hidden="true">
              ${PWA_ICONS.monitor}
            </div>
            <div class="pwa-platform-info">
              <strong>Desktop Installation</strong>
              <span>Chrome, Edge & Windows, macOS, or Linux</span>
            </div>
            <div class="pwa-platform-arrow" aria-hidden="true">
              ${PWA_ICONS.chevronRight}
            </div>
          </button>

          <!-- 2. Android Installation Card -->
          <button type="button" class="pwa-platform-card" data-select-guide="android">
            <div class="pwa-platform-icon" aria-hidden="true">
              ${PWA_ICONS.smartphone}
            </div>
            <div class="pwa-platform-info">
              <strong>Android Installation</strong>
              <span>Chrome, Samsung Internet & Android devices</span>
            </div>
            <div class="pwa-platform-arrow" aria-hidden="true">
              ${PWA_ICONS.chevronRight}
            </div>
          </button>

          <!-- 3. iPhone & iPad Installation Card -->
          <button type="button" class="pwa-platform-card" data-select-guide="ios">
            <div class="pwa-platform-icon" aria-hidden="true">
              ${PWA_ICONS.tablet}
            </div>
            <div class="pwa-platform-info">
              <strong>iPhone & iPad Installation</strong>
              <span>Safari Share menu & Add to Home Screen</span>
            </div>
            <div class="pwa-platform-arrow" aria-hidden="true">
              ${PWA_ICONS.chevronRight}
            </div>
          </button>
        </div>

        ${this.deferredPrompt ? `
          <div class="pwa-native-action-row" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-subtle)">
            <button type="button" class="btn btn-primary" id="pwaDirectInstallBtn" style="width:100%;height:38px">
              ${PWA_ICONS.download}
              <span>Install Directly on This Browser</span>
            </button>
          </div>
        ` : ''}
      `;

      // Bind card click listeners
      body.querySelectorAll('[data-select-guide]').forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPlatform = card.getAttribute('data-select-guide');
          this.renderGuideView(targetPlatform);
        });
      });

      document.getElementById('pwaDirectInstallBtn')?.addEventListener('click', () => {
        this.triggerNativeInstallPrompt();
      });

      return;
    }

    if (viewKey === 'desktop') {
      titleEl.textContent = 'Desktop Installation';
      backBtn.style.display = 'inline-flex';

      body.innerHTML = `
        <p style="margin:0;color:var(--text-primary);font-size:13.5px">
          Follow these steps to install HabitFlow on your desktop or laptop computer:
        </p>

        <ol class="pwa-steps-list">
          <li>
            <div class="step-num">1</div>
            <div class="step-text">Open HabitFlow in a supported browser (<strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or a compatible Chromium browser).</div>
          </li>
          <li>
            <div class="step-num">2</div>
            <div class="step-text">
              Look for the <strong>Install</strong> icon
              <span class="step-icon-badge">${PWA_ICONS.download}</span>
              in the browser address bar (right side), or open the browser menu (three dots).
            </div>
          </li>
          <li>
            <div class="step-num">3</div>
            <div class="step-text">Select <strong>Install app</strong> or <strong>Install HabitFlow</strong> when available.</div>
          </li>
          <li>
            <div class="step-num">4</div>
            <div class="step-text">Confirm installation in the browser prompt.</div>
          </li>
          <li>
            <div class="step-num">5</div>
            <div class="step-text">Launch HabitFlow directly from your desktop, Start menu, Applications folder, or browser's installed-apps section.</div>
          </li>
        </ol>

        <div class="pwa-guide-note">
          Exact steps and button icons vary slightly by browser and operating system (Windows, macOS, or Linux). If HabitFlow is already installed on your computer, you can launch it directly from your existing applications.
        </div>

        ${this.deferredPrompt ? `
          <div class="pwa-native-action-row">
            <button type="button" class="btn btn-primary" id="pwaDesktopTriggerInstallBtn" style="width:100%;height:38px">
              ${PWA_ICONS.download}
              <span>Trigger Desktop Installation Prompt</span>
            </button>
          </div>
        ` : ''}
      `;

      document.getElementById('pwaDesktopTriggerInstallBtn')?.addEventListener('click', () => {
        this.triggerNativeInstallPrompt();
      });

      return;
    }

    if (viewKey === 'android') {
      titleEl.textContent = 'Android Installation';
      backBtn.style.display = 'inline-flex';

      body.innerHTML = `
        <p style="margin:0;color:var(--text-primary);font-size:13.5px">
          Follow these steps to install HabitFlow on your Android phone or tablet:
        </p>

        <ol class="pwa-steps-list">
          <li>
            <div class="step-num">1</div>
            <div class="step-text">Open HabitFlow in a supported mobile browser, preferably <strong>Google Chrome</strong>.</div>
          </li>
          <li>
            <div class="step-num">2</div>
            <div class="step-text">Open the browser menu (tap the three vertical dots in the top-right corner) if an automatic installation banner is not already visible.</div>
          </li>
          <li>
            <div class="step-num">3</div>
            <div class="step-text">Select <strong>Install app</strong> or <strong>Add to Home screen</strong>, depending on your browser.</div>
          </li>
          <li>
            <div class="step-num">4</div>
            <div class="step-text">Confirm the installation when prompted by the browser.</div>
          </li>
          <li>
            <div class="step-num">5</div>
            <div class="step-text">Open HabitFlow directly from your device home screen or application launcher.</div>
          </li>
        </ol>

        <div class="pwa-guide-note">
          Menu options and wording vary slightly across mobile browsers (Chrome, Samsung Internet, Edge, Firefox). If your browser provides native installation, you can install HabitFlow directly.
        </div>

        ${this.deferredPrompt ? `
          <div class="pwa-native-action-row">
            <button type="button" class="btn btn-primary" id="pwaAndroidTriggerInstallBtn" style="width:100%;height:38px">
              ${PWA_ICONS.download}
              <span>Install HabitFlow on Android Now</span>
            </button>
          </div>
        ` : ''}
      `;

      document.getElementById('pwaAndroidTriggerInstallBtn')?.addEventListener('click', () => {
        this.triggerNativeInstallPrompt();
      });

      return;
    }

    if (viewKey === 'ios') {
      titleEl.textContent = 'iPhone & iPad Installation';
      backBtn.style.display = 'inline-flex';

      body.innerHTML = `
        <p style="margin:0;color:var(--text-primary);font-size:13.5px">
          Follow these steps to install HabitFlow on your iPhone or iPad:
        </p>

        <ol class="pwa-steps-list">
          <li>
            <div class="step-num">1</div>
            <div class="step-text">Open HabitFlow in <strong>Safari</strong> on your iPhone or iPad.</div>
          </li>
          <li>
            <div class="step-num">2</div>
            <div class="step-text">
              Tap the <strong>Share</strong> button
              <span class="step-icon-badge">${PWA_ICONS.share}</span>
              in the browser toolbar.
            </div>
          </li>
          <li>
            <div class="step-num">3</div>
            <div class="step-text">
              Scroll down and tap <strong>Add to Home Screen</strong>
              <span class="step-icon-badge">${PWA_ICONS.plusSquare}</span>.
            </div>
          </li>
          <li>
            <div class="step-num">4</div>
            <div class="step-text">Confirm by tapping <strong>Add</strong> in the top-right corner.</div>
          </li>
        </ol>

        <div class="pwa-guide-note">
          Installation generally needs to be completed through Safari's Share menu because Apple iOS does not provide the same installation prompt API as supported Chromium browsers. Websites cannot programmatically open Safari's native Add to Home Screen interface.
        </div>
      `;

      return;
    }
  }

  /**
   * Open the installation guide modal (optionally preselecting a platform)
   */
  openGuide(platform = 'platforms') {
    if (!this.modalEl) {
      this.createGuideModalElements();
    }
    this.renderGuideView(platform);
    this.modalEl.classList.add('is-open');

    // Also support alias selector if any legacy code checks #pwaIosModal
    const iosAlias = document.getElementById('pwaIosModal');
    if (iosAlias) {
      iosAlias.classList.add('is-open');
    }
  }

  /**
   * Close the installation guide modal cleanly
   * Preserves form inputs, does not submit or reload
   */
  closeGuide() {
    if (this.modalEl) {
      this.modalEl.classList.remove('is-open');
    }
    const iosAlias = document.getElementById('pwaIosModal');
    if (iosAlias) {
      iosAlias.classList.remove('is-open');
    }
  }

  /**
   * Bind install buttons in Account Slide Panel, Settings Modal, and page links
   */
  bindUIButtons() {
    // 1. Account Slide Panel Install Button
    const accountPanelBtn = document.getElementById('accountPanelInstallBtn');
    if (accountPanelBtn) {
      accountPanelBtn.addEventListener('click', () => {
        document.getElementById('accountSlidePanel')?.classList.remove('is-open');
        document.getElementById('accountPanelBackdrop')?.classList.remove('is-open');
        this.handleUserInstallClick();
      });
    }

    // 2. Settings Modal Install Button
    const settingsBtn = document.getElementById('settingsInstallBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.handleUserInstallClick();
      });
    }

    // 3. Global triggers with [data-open-install-guide]
    document.querySelectorAll('[data-open-install-guide]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.openGuide('platforms');
      });
    });

    // 4. Global triggers with [data-open-platform-guide]
    document.querySelectorAll('[data-open-platform-guide]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const platform = el.getAttribute('data-open-platform-guide');
        this.openGuide(platform);
      });
    });
  }

  /**
   * Handle user clicking an Install button in the UI
   */
  handleUserInstallClick() {
    if (this.isInstalled) {
      this.showToast('HabitFlow is already running as an installed application.', 'info');
      return;
    }

    if (this.deferredPrompt) {
      this.triggerNativeInstallPrompt();
      return;
    }

    if (this.isIOS()) {
      this.openGuide('ios');
      return;
    }

    // Show platform selection guide for manual installation
    this.openGuide('platforms');
  }

  /**
   * Trigger the saved browser installation prompt
   */
  async triggerNativeInstallPrompt() {
    if (!this.deferredPrompt) {
      if (this.isIOS()) {
        this.openGuide('ios');
      } else {
        this.openGuide('platforms');
      }
      return;
    }

    const promptEvent = this.deferredPrompt;
    this.hideInstallBanner();
    this.closeGuide();

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;

      if (choiceResult && choiceResult.outcome === 'accepted') {
        this.isInstalled = true;
        this.deferredPrompt = null;
        this.updateInstallButtons();
      } else {
        localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
      }
    } catch (err) {
      console.warn('[HabitFlow PWA] Prompt execution error:', err);
    }
  }

  /**
   * Dismiss the banner and record timestamp
   */
  dismissBanner() {
    this.hideInstallBanner();
    localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
  }

  /**
   * Show banner with slide-up animation
   */
  showInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner && !this.isInstalled) {
      banner.classList.add('is-visible');
    }
  }

  /**
   * Hide banner
   */
  hideInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.classList.remove('is-visible');
    }
  }

  /**
   * Update install buttons across the UI based on installation state
   */
  updateInstallButtons() {
    const accountPanelBtn = document.getElementById('accountPanelInstallBtn');
    const settingsBtn = document.getElementById('settingsInstallBtn');
    const settingsDesc = document.getElementById('settingsInstallDescription');

    if (this.isInstalled) {
      if (accountPanelBtn) {
        accountPanelBtn.style.display = 'none';
      }
      if (settingsBtn) {
        settingsBtn.disabled = true;
        settingsBtn.classList.remove('btn-primary');
        settingsBtn.classList.add('btn-secondary');
        settingsBtn.innerHTML = `${PWA_ICONS.check} <span>Installed</span>`;
      }
      if (settingsDesc) {
        settingsDesc.textContent = 'HabitFlow is running as an installed standalone application on this device.';
      }
      this.hideInstallBanner();
      return;
    }

    if (accountPanelBtn) {
      accountPanelBtn.style.display = 'flex';
    }
    if (settingsBtn) {
      settingsBtn.disabled = false;
      settingsBtn.classList.add('btn-primary');
      settingsBtn.classList.remove('btn-secondary');
      settingsBtn.innerHTML = `${PWA_ICONS.download} <span>Install App</span>`;
    }
    if (settingsDesc) {
      settingsDesc.textContent = 'Install HabitFlow for fast access and reliable offline viewing on your home screen or desktop.';
    }
  }

  /**
   * Setup network online/offline monitoring
   */
  setupNetworkMonitoring() {
    const updateStatus = (isOnline) => {
      const existingBadge = document.getElementById('pwaNetworkStatus');
      if (!isOnline) {
        if (!existingBadge) {
          const badge = document.createElement('div');
          badge.id = 'pwaNetworkStatus';
          badge.className = 'pwa-network-badge is-offline';
          badge.setAttribute('role', 'status');
          badge.innerHTML = `
            ${PWA_ICONS.wifiOff}
            <span>Offline — habits are viewable. Saving changes requires internet.</span>
          `;
          document.body.appendChild(badge);
        }
      } else {
        if (existingBadge) {
          existingBadge.className = 'pwa-network-badge is-online';
          existingBadge.innerHTML = `
            ${PWA_ICONS.wifi}
            <span>Back online — connection restored.</span>
          `;
          setTimeout(() => {
            existingBadge.remove();
          }, 3000);
        }
      }
    };

    window.addEventListener('online', () => updateStatus(true));
    window.addEventListener('offline', () => updateStatus(false));

    if (!navigator.onLine) {
      updateStatus(false);
    }
  }

  /**
   * Toast notification helper matching HabitFlow styling
   */
  showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `pwa-toast pwa-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-active');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('is-active');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}

// Export singleton instance
export const pwa = new PwaManager();
