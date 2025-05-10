import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

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
  });
  
  if (error) throw error;
  return data;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
