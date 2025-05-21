<script lang="ts">
  import { onMount } from 'svelte';
  import { ModeWatcher, mode, setMode } from 'mode-watcher';

  onMount(() => {
    // Apply the theme on initial load
    const storedTheme = localStorage.getItem('theme-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let initialTheme = storedTheme;
    if (!initialTheme) {
      initialTheme = prefersDark ? 'dark' : 'light';
    }

    // Update the document class for Tailwind
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set the initial mode
    setMode(initialTheme);
  });
</script>

<ModeWatcher
  attribute="class"
  defaultMode="light"
  storageKey="theme-mode"
/>

<slot />
