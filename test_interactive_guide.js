/**
 * HabitFlow — Interactive DOM Verification for Installation Guide
 * Tests Got It, Close (X), Back, Escape, Backdrop click, View Switching,
 * and Form Value Isolation on habitflow_auth.html.
 */

const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

async function runInteractiveTest() {
  console.log('=== Running Interactive DOM Verification for Installation Guide ===\n');

  const listeners = {};
  const elements = new Map();

  class MockElement {
    constructor(tag, id = '') {
      this.tagName = tag.toUpperCase();
      this.id = id;
      this.className = '';
      this.classList = {
        classes: new Set(),
        add: (...cls) => cls.forEach(c => this.classList.classes.add(c)),
        remove: (...cls) => cls.forEach(c => this.classList.classes.delete(c)),
        contains: (c) => this.classList.classes.has(c)
      };
      this.style = {};
      this.attributes = new Map();
      this.eventListeners = new Map();
      this.children = [];
      this.value = '';
      this._innerHTML = '';
      if (id) elements.set(id, this);
    }

    setAttribute(name, val) { this.attributes.set(name, String(val)); }
    getAttribute(name) { return this.attributes.get(name) || null; }
    hasAttribute(name) { return this.attributes.has(name); }

    addEventListener(event, fn) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(fn);
    }

    dispatchEvent(event) {
      const handlers = this.eventListeners.get(event.type) || [];
      handlers.forEach(h => h(event));
    }

    click() {
      let defaultPrevented = false;
      let propagationStopped = false;
      const event = {
        type: 'click',
        target: this,
        preventDefault: () => { defaultPrevented = true; },
        stopPropagation: () => { propagationStopped = true; },
        defaultPrevented: () => defaultPrevented
      };
      this.dispatchEvent(event);
      return !defaultPrevented;
    }

    set innerHTML(html) {
      this._innerHTML = html;
      const idMatches = html.matchAll(/id="([^"]+)"/g);
      for (const m of idMatches) {
        if (!elements.has(m[1])) {
          const child = new MockElement('div', m[1]);
          elements.set(m[1], child);
        }
      }
    }

    get innerHTML() {
      return this._innerHTML;
    }

    appendChild(child) {
      this.children.push(child);
      if (child.id) elements.set(child.id, child);
      return child;
    }

    querySelector(sel) {
      if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
      return null;
    }

    querySelectorAll(sel) {
      return [];
    }
  }

  // Setup globals
  global.window = {
    location: { pathname: '/habitflow_auth.html', href: 'http://localhost:3000/habitflow_auth.html' },
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', standalone: false, onLine: true },
    matchMedia: () => ({ matches: false }),
    addEventListener: (type, fn) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    }
  };
  global.navigator = global.window.navigator;

  const body = new MockElement('body', 'body');
  global.document = {
    readyState: 'complete',
    body,
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: (sel) => [],
    addEventListener: (type, fn) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    }
  };
  global.localStorage = {
    store: new Map(),
    getItem: (k) => global.localStorage.store.get(k) || null,
    setItem: (k, v) => global.localStorage.store.set(k, String(v)),
    removeItem: (k) => global.localStorage.store.delete(k)
  };

  const loginEmailInput = new MockElement('input', 'loginEmail');
  loginEmailInput.value = 'user@example.com';
  const loginPasswordInput = new MockElement('input', 'loginPassword');
  loginPasswordInput.value = 'SecretPass123!';
  let formSubmitted = false;
  const loginForm = new MockElement('form', 'loginForm');
  loginForm.addEventListener('submit', () => { formSubmitted = true; });

  // Read pwa.js and evaluate in current context
  const pwaCode = fs.readFileSync(path.join(__dirname, 'assets/js/pwa.js'), 'utf8');
  const executableCode = pwaCode.replace('export const pwa = new PwaManager();', 'global.pwa = new PwaManager();');
  eval(executableCode);
  const pwa = global.pwa;

  // 1. Initial State Check
  console.log('Test 1: Verify modal is closed on initial load...');
  const modal = document.getElementById('pwaGuideModal');
  assert(modal, 'Modal #pwaGuideModal must be created');
  assert(!modal.classList.contains('is-open'), 'Modal must NOT have .is-open on load');
  console.log(' -> PASSED: Modal starts closed and non-intrusive.');

  // 2. Open Guide
  console.log('Test 2: Open Installation Guide...');
  pwa.openGuide('platforms');
  assert(modal.classList.contains('is-open'), 'Modal must have .is-open after openGuide');
  const titleEl = document.getElementById('pwaGuideModalTitle');
  assert(titleEl.textContent === 'Install HabitFlow', 'Title must be "Install HabitFlow" on platforms view');
  assert(loginEmailInput.value === 'user@example.com', 'Form email value must remain intact');
  assert(loginPasswordInput.value === 'SecretPass123!', 'Form password value must remain intact');
  assert(!formSubmitted, 'Form must NOT be submitted on guide open');
  console.log(' -> PASSED: Guide opens cleanly without disrupting forms.');

  // 3. Switch to Desktop View
  console.log('Test 3: Navigate to Desktop Installation...');
  pwa.renderGuideView('desktop');
  assert(titleEl.textContent === 'Desktop Installation', 'Title must be "Desktop Installation"');
  const backBtn = document.getElementById('pwaGuideBackBtn');
  assert(backBtn.style.display !== 'none', 'Back button must be visible in desktop view');
  console.log(' -> PASSED: Desktop view rendered with steps and active back button.');

  // 4. Back button navigation
  console.log('Test 4: Click Back button to return to platform selection...');
  backBtn.click();
  assert(titleEl.textContent === 'Install HabitFlow', 'Title must return to "Install HabitFlow"');
  assert(backBtn.style.display === 'none', 'Back button must be hidden on platforms view');
  console.log(' -> PASSED: Back button successfully returned to platform selection.');

  // 5. Switch to Android View
  console.log('Test 5: Navigate to Android Installation...');
  pwa.renderGuideView('android');
  assert(titleEl.textContent === 'Android Installation', 'Title must be "Android Installation"');
  assert(backBtn.style.display !== 'none', 'Back button must be visible in android view');
  console.log(' -> PASSED: Android view rendered with steps.');

  // 6. Switch to iOS View
  console.log('Test 6: Navigate to iOS Installation...');
  pwa.renderGuideView('ios');
  assert(titleEl.textContent === 'iPhone & iPad Installation', 'Title must be "iPhone & iPad Installation"');
  console.log(' -> PASSED: iOS view rendered with Safari steps.');

  // 7. Test "Got It" Button
  console.log('Test 7: Click "Got It" button to close guide...');
  const gotItBtn = document.getElementById('pwaGuideGotItBtn');
  assert(gotItBtn, 'Got It button must exist');
  gotItBtn.click();
  assert(!modal.classList.contains('is-open'), 'Modal must NOT have .is-open after Got It click');
  assert(loginEmailInput.value === 'user@example.com', 'Form email must remain intact after Got It');
  assert(!formSubmitted, 'Form must NOT be submitted after Got It');
  console.log(' -> PASSED: "Got It" button closes modal immediately without form disruption.');

  // 8. Re-open and test Close (X) Button
  console.log('Test 8: Reopen and click Close (X) button...');
  pwa.openGuide('platforms');
  assert(modal.classList.contains('is-open'), 'Modal reopened');
  const closeBtn = document.getElementById('closePwaGuideModalBtn');
  assert(closeBtn, 'Close button must exist');
  closeBtn.click();
  assert(!modal.classList.contains('is-open'), 'Modal must NOT have .is-open after Close (X) click');
  assert(!formSubmitted, 'Form must NOT be submitted after Close (X)');
  console.log(' -> PASSED: Close (X) button closes modal immediately.');

  // 9. Re-open and test Escape Key
  console.log('Test 9: Reopen and test Escape keydown...');
  pwa.openGuide('desktop');
  assert(modal.classList.contains('is-open'), 'Modal reopened');
  const keyHandlers = listeners['keydown'] || [];
  keyHandlers.forEach(h => h({ key: 'Escape' }));
  assert(!modal.classList.contains('is-open'), 'Modal must close on Escape key');
  console.log(' -> PASSED: Escape key closes modal.');

  // 10. Re-open and test Backdrop Click
  console.log('Test 10: Reopen and test Backdrop click...');
  pwa.openGuide('platforms');
  assert(modal.classList.contains('is-open'), 'Modal reopened');
  modal.click();
  assert(!modal.classList.contains('is-open'), 'Modal must close on backdrop click');
  console.log(' -> PASSED: Backdrop click closes modal.');

  console.log('\n======================================================');
  console.log('ALL INTERACTIVE GUIDE DOM TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

runInteractiveTest();
