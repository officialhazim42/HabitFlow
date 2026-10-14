/**
 * HabitFlow — Runtime Configuration
 *
 * Configures Supabase connection parameters.
 * You can supply credentials via:
 * 1. Editing the default constants below
 * 2. Setting window.__HABITFLOW_CONFIG__ before this script loads
 * 3. Entering your credentials into the in-app Developer Connection Settings
 */

const DEFAULT_CONFIG = {
  // Replace these with your actual Supabase project credentials from Project Settings > API
  supabaseUrl: 'https://your-project-id.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here',
  appName: 'HabitFlow',
  version: '1.2.0'
};

// Check for runtime config overrides from localStorage (useful for development testing)
function getSavedConfig() {
  try {
    const saved = localStorage.getItem('habitflow_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read config from localStorage', e);
  }
  return null;
}

const windowConfig = (typeof window !== 'undefined' && window.__HABITFLOW_CONFIG__) || {};
const savedConfig = getSavedConfig() || {};

export const CONFIG = {
  supabaseUrl: savedConfig.supabaseUrl || windowConfig.supabaseUrl || DEFAULT_CONFIG.supabaseUrl,
  supabaseAnonKey: savedConfig.supabaseAnonKey || windowConfig.supabaseAnonKey || DEFAULT_CONFIG.supabaseAnonKey,
  appName: DEFAULT_CONFIG.appName,
  version: DEFAULT_CONFIG.version,
  
  // Checks if credentials are real and not default placeholders
  isConfigured() {
    return (
      Boolean(this.supabaseUrl) &&
      Boolean(this.supabaseAnonKey) &&
      !this.supabaseUrl.includes('your-project-id') &&
      !this.supabaseAnonKey.includes('your-anon-key-here') &&
      this.supabaseUrl.startsWith('https://')
    );
  },

  // Save credentials entered by developer in setup helper
  saveCredentials(url, key) {
    if (!url || !key) throw new Error('Both Supabase URL and Anon Key are required');
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanKey = key.trim();
    if (!cleanUrl.startsWith('https://')) {
      throw new Error('Supabase URL must start with https://');
    }
    const cfg = { supabaseUrl: cleanUrl, supabaseAnonKey: cleanKey };
    localStorage.setItem('habitflow_supabase_config', JSON.stringify(cfg));
    this.supabaseUrl = cleanUrl;
    this.supabaseAnonKey = cleanKey;
  },

  // Reset to default
  clearCredentials() {
    localStorage.removeItem('habitflow_supabase_config');
    this.supabaseUrl = DEFAULT_CONFIG.supabaseUrl;
    this.supabaseAnonKey = DEFAULT_CONFIG.supabaseAnonKey;
  }
};
