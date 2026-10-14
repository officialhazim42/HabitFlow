/**
 * HabitFlow — Runtime Configuration
 *
 * Configures Supabase connection parameters.
 * Connection is configured once by the application developer.
 * Credentials are supplied via:
 * 1. Default constants configured below
 * 2. Window runtime config (window.__HABITFLOW_CONFIG__) injected by server or build script
 * 3. Environment variables (.env) managed by developer
 */

const DEFAULT_CONFIG = {
  supabaseUrl: 'https://wzeuroydrorelcxprgew.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here',
  appName: 'HabitFlow',
  version: '1.2.0'
};

// Check for developer runtime config (injected via server or window)
const windowConfig = (typeof window !== 'undefined' && window.__HABITFLOW_CONFIG__) || {};

export const CONFIG = {
  supabaseUrl: windowConfig.supabaseUrl || DEFAULT_CONFIG.supabaseUrl,
  supabaseAnonKey: windowConfig.supabaseAnonKey || DEFAULT_CONFIG.supabaseAnonKey,
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
  }
};
