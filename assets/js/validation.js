/**
 * HabitFlow — Input Validation Suite
 *
 * Provides reusable client-side validations for authentication and forms.
 */

// RFC 5322 compliant simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return EMAIL_REGEX.test(trimmed) && trimmed.length <= 254;
}

export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  return name.trim().length >= 2;
}

/**
 * Calculates password security score (0 to 5) and returns UI strength feedback.
 */
export function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, percent: 0, label: '', color: '' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Weak';
  let color = '#ff8585'; // var(--danger)
  
  if (score >= 4) {
    label = 'Strong';
    color = '#9be15d'; // var(--accent)
  } else if (score >= 3) {
    label = 'Good';
    color = '#63d6bd'; // var(--accent-2)
  } else if (score >= 2) {
    label = 'Fair';
    color = '#f4d17d';
  }

  const percent = Math.min(100, Math.round((score / 5) * 100));

  return {
    score,
    percent,
    label: `Password strength: ${label}`,
    color,
    isSufficient: password.length >= 8
  };
}

export function doPasswordsMatch(pwd1, pwd2) {
  return Boolean(pwd1) && pwd1 === pwd2;
}
