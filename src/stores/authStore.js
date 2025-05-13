import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { toast } from 'svelte-sonner';
import { createVerificationToastContent } from '$lib/utils/emailUtils';

// Create a writable store for the user
export const user = writable(null);

// Initialize the store with the current session
export const initializeAuthStore = async () => {
  const { data } = await supabase.auth.getSession();
  
  if (data.session) {
    user.set(data.session.user);
  }
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      user.set(session.user);
    } else if (event === 'SIGNED_OUT') {
      user.set(null);
    }
  });
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

// Sign up with email and password
export const signUpWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'https://app.esmtagent.com/auth/callback'
    }
  });
  
  if (error) throw error;
  
  // Show verification toast if signup was successful
  if (data?.user) {
    const { title, description, action } = createVerificationToastContent(email);
    
    toast(title, {
      description,
      duration: 10000, // 10 seconds
      action: action ? {
        label: action.label,
        onClick: () => window.open(action.url, '_blank')
      } : undefined,
    });
  }
  
  return data;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  // Refresh the page after sign out
  window.location.reload();
};
