/**
 * HabitFlow — Password Reset Controller
 * Handles the recovery token from Supabase authentication email and updates the password.
 */

import { CONFIG } from './config.js';
import { getSupabase, formatAuthError } from './supabase-client.js';
import { evaluatePasswordStrength, doPasswordsMatch } from './validation.js';
import { showToast } from './profile.js';

const resetForm = document.getElementById('resetForm');
const resetMessage = document.getElementById('resetMessage');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const strengthBox = document.getElementById('strength');
const strengthBar = document.getElementById('strengthBar');
const strengthLabel = document.getElementById('strengthLabel');
const submitBtn = document.getElementById('resetSubmitBtn');

function showMsg(text, type = 'success') {
  if (!resetMessage) return;
  resetMessage.textContent = text;
  resetMessage.className = 'message show ' + type;
}

function clearMsg() {
  if (!resetMessage) return;
  resetMessage.textContent = '';
  resetMessage.className = 'message';
}

function setBtnLoading(isLoading) {
  if (!submitBtn) return;
  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> <span>Updating password...</span>';
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Save New Password <span aria-hidden="true">→</span>';
  }
}

async function initResetPassword() {
  const supabase = getSupabase();
  if (!supabase) {
    showMsg('Supabase is not configured. Please configure your project credentials to reset passwords.', 'error');
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  // Password visibility toggles
  document.querySelectorAll('[data-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = document.getElementById(toggle.dataset.toggle);
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        const eyeIcon = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const eyeOffIcon = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;
        toggle.innerHTML = isPass ? eyeOffIcon : eyeIcon;
        toggle.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
      }
    });
  });

  // Strength meter
  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', () => {
      const val = newPasswordInput.value;
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

  // Listen to Auth State Changes (e.g., PASSWORD_RECOVERY event)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showToast('Password recovery session established. You may now set your new password.', 'info');
    }
  });

  // Verify that an active session or recovery hash exists
  const hash = window.location.hash;
  const isRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token=');
  
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!session && !isRecoveryHash) {
    showMsg('No valid recovery token detected. If your link expired, please request a new password reset link.', 'error');
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  // Handle Form Submission
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg();

      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmNewPasswordInput.value;

      const assessment = evaluatePasswordStrength(newPassword);
      if (!assessment.isSufficient) {
        showMsg('Password must be at least 8 characters long.', 'error');
        newPasswordInput.focus();
        return;
      }

      if (!doPasswordsMatch(newPassword, confirmPassword)) {
        showMsg('Passwords do not match. Please ensure both passwords match exactly.', 'error');
        confirmNewPasswordInput.focus();
        return;
      }

      setBtnLoading(true);

      try {
        const { data, error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) throw updateError;

        showMsg('Password updated successfully! Redirecting you to login...', 'success');
        showToast('Password updated! Redirecting...', 'success');
        
        setTimeout(() => {
          window.location.href = 'habitflow_auth.html';
        }, 1500);
      } catch (err) {
        console.error('Password update failure:', err);
        showMsg(formatAuthError(err), 'error');
      } finally {
        setBtnLoading(false);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResetPassword);
} else {
  initResetPassword();
}
