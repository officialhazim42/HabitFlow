/**
 * HabitFlow — Authentication Controller
 * Manages Login, Registration, Password Recovery, OAuth, and Session Redirection.
 */

import { CONFIG } from './config.js';
import { getSupabase, formatAuthError, signInWithGoogle, signInWithFacebook, reloadSupabaseClient } from './supabase-client.js';
import { isValidEmail, isValidName, evaluatePasswordStrength, doPasswordsMatch } from './validation.js';
import { openDeveloperModal, showToast } from './profile.js';

// DOM Elements
const views = {
  login: { heading: 'Welcome back', sub: 'Pick up where you left off. Your goals are waiting.' },
  signup: { heading: 'Create your account', sub: 'Start building better habits, one day at a time.' },
  forgot: { heading: 'Reset your password', sub: 'No worries. Let’s get you back on track.' }
};

const tabs = document.getElementById('tabs');
const headingEl = document.getElementById('heading');
const subheadingEl = document.getElementById('subheading');
const messageEl = document.getElementById('message');
const securityNoteEl = document.getElementById('securityNote');
const configBannerEl = document.getElementById('configBanner');

// Password strength elements
const signupPasswordInput = document.getElementById('signupPassword');
const strengthBox = document.getElementById('strength');
const strengthBar = document.getElementById('strengthBar');
const strengthLabel = document.getElementById('strengthLabel');

// Setup modal elements
const configModal = document.getElementById('configModal');
const configForm = document.getElementById('configForm');
const openConfigModalBtn = document.getElementById('openConfigModalBtn');
const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');

function showMessage(text, type = 'success') {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = 'message show ' + type;
  messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearMessage() {
  if (!messageEl) return;
  messageEl.textContent = '';
  messageEl.className = 'message';
}

function setButtonLoading(button, isLoading, loadingText = 'Please wait...') {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalHtml = button.innerHTML;
    button.innerHTML = `<span class="spinner"></span> <span>${loadingText}</span>`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
    }
  }
}

export function switchView(view) {
  if (!views[view]) return;
  clearMessage();
  document.querySelectorAll('.form').forEach(form => form.classList.remove('active'));
  
  const targetForm = document.getElementById(view + 'Form');
  if (targetForm) targetForm.classList.add('active');

  if (headingEl) headingEl.textContent = views[view].heading;
  if (subheadingEl) subheadingEl.textContent = views[view].sub;

  if (tabs) {
    tabs.style.display = view === 'forgot' ? 'none' : 'flex';
    document.querySelectorAll('.tab').forEach(tab => {
      const active = tab.dataset.view === view;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }

  if (securityNoteEl) {
    securityNoteEl.style.display = view === 'forgot' ? 'none' : 'block';
  }
}

/**
 * Check if the user already has an active session. If so, redirect to dashboard.
 */
async function checkExistingSession() {
  const supabase = getSupabase();
  if (!supabase) {
    updateConfigBanner();
    return;
  }

  updateConfigBanner();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session && session.user) {
      window.location.replace('dashboard.html');
    }
  } catch (err) {
    console.warn('Session check warning:', err.message);
  }
}

function updateConfigBanner() {
  if (!configBannerEl) return;
  if (!CONFIG.isConfigured()) {
    configBannerEl.style.display = 'flex';
  } else {
    configBannerEl.style.display = 'none';
  }
}

// Initialize Auth Page Listeners
export function initAuth() {
  checkExistingSession();

  // Detect OAuth errors from query parameters or hash
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const oauthError = searchParams.get('error_description') || searchParams.get('error') ||
                     hashParams.get('error_description') || hashParams.get('error');
  if (oauthError) {
    showMessage(formatAuthError(new Error(decodeURIComponent(oauthError))), 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Tab and view switches
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Global click delegate for links, toggles, modals
  document.addEventListener('click', async (event) => {
    // View Switchers
    const viewTrigger = event.target.closest('[data-view]');
    if (viewTrigger) {
      event.preventDefault();
      switchView(viewTrigger.dataset.view);
    }

    // Password Visibility Toggle
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) {
      const input = document.getElementById(toggle.dataset.toggle);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const eyeIcon = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const eyeOffIcon = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;
        toggle.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
        toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      }
    }

    // Social OAuth Buttons
    const socialBtn = event.target.closest('[data-social]');
    if (socialBtn) {
      const provider = socialBtn.dataset.social;
      handleSocialAuth(provider, socialBtn);
    }
  });

  // Password Strength Meter Listener
  if (signupPasswordInput) {
    signupPasswordInput.addEventListener('input', () => {
      const val = signupPasswordInput.value;
      if (!val) {
        if (strengthBox) strengthBox.style.display = 'none';
        if (strengthLabel) strengthLabel.style.display = 'none';
        return;
      }

      if (strengthBox) strengthBox.style.display = 'block';
      if (strengthLabel) strengthLabel.style.display = 'block';

      const assessment = evaluatePasswordStrength(val);
      if (strengthBar) {
        strengthBar.style.width = assessment.percent + '%';
        strengthBar.style.backgroundColor = assessment.color;
      }
      if (strengthLabel) {
        strengthLabel.textContent = assessment.label;
        strengthLabel.style.color = assessment.color;
      }
    });
  }

  // Login Form Submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage();

      const email = document.getElementById('loginEmail')?.value.trim();
      const password = document.getElementById('loginPassword')?.value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        document.getElementById('loginEmail')?.focus();
        return;
      }
      if (!password) {
        showMessage('Please enter your password.', 'error');
        document.getElementById('loginPassword')?.focus();
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        showMessage('Supabase credentials are not configured. Click "Connect Supabase" above to enter your project credentials.', 'error');
        if (configModal) configModal.classList.add('is-open');
        return;
      }

      setButtonLoading(submitBtn, true, 'Signing in...');

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        showMessage('Login successful! Redirecting to dashboard...', 'success');
        showToast('Welcome back to HabitFlow!', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } catch (err) {
        console.error('Login error:', err);
        showMessage(formatAuthError(err), 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Signup Form Submission
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage();

      const name = document.getElementById('fullName')?.value.trim();
      const email = document.getElementById('signupEmail')?.value.trim();
      const password = document.getElementById('signupPassword')?.value;
      const confirmPassword = document.getElementById('confirmPassword')?.value;
      const agreeTerms = document.getElementById('agreeTerms')?.checked;
      const submitBtn = signupForm.querySelector('button[type="submit"]');

      if (!isValidName(name)) {
        showMessage('Please enter your full name (at least 2 characters).', 'error');
        document.getElementById('fullName')?.focus();
        return;
      }

      if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        document.getElementById('signupEmail')?.focus();
        return;
      }

      const assessment = evaluatePasswordStrength(password);
      if (!assessment.isSufficient) {
        showMessage('Password must be at least 8 characters long.', 'error');
        document.getElementById('signupPassword')?.focus();
        return;
      }

      if (!doPasswordsMatch(password, confirmPassword)) {
        showMessage('Passwords do not match. Please verify and try again.', 'error');
        document.getElementById('confirmPassword')?.focus();
        return;
      }

      if (!agreeTerms) {
        showMessage('You must agree to the Terms of Service and Privacy Policy to create an account.', 'error');
        document.getElementById('agreeTerms')?.focus();
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        showMessage('Supabase credentials are not configured. Click "Connect Supabase" above to enter your project credentials.', 'error');
        if (configModal) configModal.classList.add('is-open');
        return;
      }

      setButtonLoading(submitBtn, true, 'Creating account...');

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              name: name
            },
            emailRedirectTo: `${window.location.origin}/dashboard.html`
          }
        });

        if (error) throw error;

        // If email confirmation is enabled, session might be null initially
        if (data.session) {
          showMessage('Account created successfully! Redirecting to dashboard...', 'success');
          showToast('Account created successfully!', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 700);
        } else {
          showMessage(
            `Account registered! A verification email has been sent to ${email}. Please check your inbox and verify your email to log in.`,
            'success'
          );
          showToast('Verification email sent! Check your inbox.', 'info', 5000);
          signupForm.reset();
        }
      } catch (err) {
        console.error('Registration error:', err);
        showMessage(formatAuthError(err), 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Forgot Password Form Submission
  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage();

      const email = document.getElementById('forgotEmail')?.value.trim();
      const submitBtn = forgotForm.querySelector('button[type="submit"]');

      if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        document.getElementById('forgotEmail')?.focus();
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        showMessage('Supabase credentials are not configured. Click "Connect Supabase" above to enter your project credentials.', 'error');
        if (configModal) configModal.classList.add('is-open');
        return;
      }

      setButtonLoading(submitBtn, true, 'Sending link...');

      try {
        const redirectTo = `${window.location.origin}/reset-password.html`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo
        });

        if (error) throw error;

        // Security best practice: generic confirmation message
        showMessage(
          'If an account exists with this email address, a password reset link has been sent. Please check your inbox.',
          'success'
        );
        showToast('Password reset link sent (if email exists).', 'info');
        forgotForm.reset();
      } catch (err) {
        console.error('Password reset error:', err);
        // Still give generic message or user-friendly error
        showMessage(formatAuthError(err), 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Setup / Config Modal Handlers
  if (openConfigModalBtn && configModal) {
    openConfigModalBtn.addEventListener('click', () => {
      const urlInput = document.getElementById('cfgSupabaseUrl');
      const keyInput = document.getElementById('cfgSupabaseKey');
      if (urlInput && !CONFIG.supabaseUrl.includes('your-project-id')) urlInput.value = CONFIG.supabaseUrl;
      if (keyInput && !CONFIG.supabaseAnonKey.includes('your-anon-key')) keyInput.value = CONFIG.supabaseAnonKey;
      configModal.classList.add('is-open');
    });
  }

  if (closeConfigModalBtn && configModal) {
    closeConfigModalBtn.addEventListener('click', () => {
      configModal.classList.remove('is-open');
    });
  }

  if (configModal) {
    configModal.addEventListener('click', (e) => {
      if (e.target === configModal) configModal.classList.remove('is-open');
    });
  }

  if (configForm) {
    configForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('cfgSupabaseUrl')?.value.trim();
      const key = document.getElementById('cfgSupabaseKey')?.value.trim();

      try {
        CONFIG.saveCredentials(url, key);
        reloadSupabaseClient();
        updateConfigBanner();
        configModal.classList.remove('is-open');
        showToast('Supabase connection credentials saved!', 'success');
        showMessage('Supabase connected! You can now log in or register.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    const resetCfgBtn = document.getElementById('cfgResetBtn');
    if (resetCfgBtn) {
      resetCfgBtn.addEventListener('click', () => {
        CONFIG.clearCredentials();
        reloadSupabaseClient();
        updateConfigBanner();
        showToast('Credentials reset to defaults.', 'info');
        configModal.classList.remove('is-open');
      });
    }
  }

  // Developer credit links
  document.querySelectorAll('[data-open-developer]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDeveloperModal();
    });
  });
}

/**
 * Handles Social OAuth sign-in with Google or Facebook
 */
async function handleSocialAuth(provider, button) {
  const supabase = getSupabase();
  if (!supabase) {
    showMessage(`To use ${provider} sign-in, please connect your Supabase project with ${provider} OAuth enabled.`, 'error');
    if (configModal) configModal.classList.add('is-open');
    return;
  }

  setButtonLoading(button, true, `${provider}...`);

  try {
    if (provider.toLowerCase() === 'google') {
      await signInWithGoogle();
    } else if (provider.toLowerCase() === 'facebook') {
      await signInWithFacebook();
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (err) {
    console.error(`${provider} OAuth error:`, err);
    showMessage(
      `${provider} sign-in failed: ${formatAuthError(err)}. Please ensure ${provider} OAuth is enabled in your Supabase Authentication settings.`,
      'error'
    );
    showToast(`${provider} OAuth is not configured in Supabase. Check README.md for setup instructions.`, 'error', 5000);
  } finally {
    setButtonLoading(button, false);
  }
}

// Auto-run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
