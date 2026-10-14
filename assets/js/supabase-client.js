/**
 * HabitFlow — Supabase Client Wrapper
 *
 * Initializes the official Supabase JavaScript client, provides session
 * observation, OAuth initiators, and user-friendly error formatting.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

let clientInstance = null;

export function getSupabase() {
  if (!CONFIG.isConfigured()) {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
}

/**
 * Re-initialize client when configuration changes (e.g., from setup modal)
 */
export function reloadSupabaseClient() {
  clientInstance = null;
  return getSupabase();
}

/**
 * Cleanly format errors to prevent displaying raw backend SQL exceptions or stack traces to users.
 */
export function formatAuthError(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Incorrect email or password. Please verify your details.';
  }
  if (msg.includes('user already registered') || msg.includes('email already in use')) {
    return 'An account with this email address already exists. Please log in instead.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email address has not been verified yet. Please check your inbox for the confirmation link.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'Password is too weak. Please use at least 8 characters with letters, numbers, and symbols.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  if (msg.includes('token has expired') || msg.includes('invalid token')) {
    return 'This password reset link has expired or has already been used. Please request a new one.';
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return 'Network connection issue. Please check your internet connection.';
  }
  if (msg.includes('oauth') || msg.includes('provider is not enabled') || msg.includes('unsupported provider') || msg.includes('provider disabled')) {
    return 'OAuth provider is not enabled in your Supabase project. In your Supabase Dashboard, go to Authentication -> Providers to enable Google or Facebook sign-in.';
  }

  // Fallback: If it's a known user-facing message, capitalize it, otherwise generic
  if (error.message && error.message.length < 120 && !error.message.includes('SQL') && !error.message.includes('PG')) {
    return error.message;
  }
  return 'Authentication service encountered an issue. Please try again shortly.';
}

/**
 * Google OAuth sign-in / registration
 */
export async function signInWithGoogle() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add your SUPABASE_URL and SUPABASE_ANON_KEY first.');
  }

  const redirectUrl = `${window.location.origin}/dashboard.html`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Facebook OAuth sign-in / registration
 */
export async function signInWithFacebook() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add your SUPABASE_URL and SUPABASE_ANON_KEY first.');
  }

  const redirectUrl = `${window.location.origin}/dashboard.html`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: redirectUrl,
      scopes: 'email,public_profile'
    }
  });

  if (error) throw error;
  return data;
}
