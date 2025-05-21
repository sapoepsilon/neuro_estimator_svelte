import { writable } from 'svelte/store';

// Create a writable store for the theme
export const theme = writable<'light' | 'dark'>('light');

// Function to toggle the theme
export function toggleTheme() {
  theme.update(currentTheme => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Update the document class for Tailwind
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Store the preference
    localStorage.setItem('theme-mode', newTheme);
    
    return newTheme;
  });
}

// Function to initialize the theme
export function initializeTheme() {
  // Get stored theme or use system preference
  const storedTheme = localStorage.getItem('theme-mode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  let initialTheme: 'light' | 'dark';
  if (storedTheme === 'dark' || (storedTheme === null && prefersDark)) {
    initialTheme = 'dark';
    document.documentElement.classList.add('dark');
  } else {
    initialTheme = 'light';
    document.documentElement.classList.remove('dark');
  }
  
  // Update the store
  theme.set(initialTheme);
}

