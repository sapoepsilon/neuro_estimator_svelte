<script lang="ts">
  import { onMount } from 'svelte';
  import { Sun, Moon } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { mode, toggleMode } from 'mode-watcher';

  let theme: 'light' | 'dark' = 'light';

  onMount(() => {
    // Subscribe to mode changes
    const unsubscribe = mode.subscribe((value) => {
      theme = value;
      updateTheme(value);
    });

    return () => {
      unsubscribe();
    };
  });

  function toggleTheme() {
    toggleMode();
    const newTheme = theme === 'light' ? 'dark' : 'light';
    updateTheme(newTheme);
  }

  function updateTheme(newTheme: string) {
    // Update the document class for Tailwind
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Store the preference
    localStorage.setItem('theme-mode', newTheme);
  }
</script>

<Button variant="ghost" size="icon" on:click={toggleTheme} aria-label="Toggle theme">
  {#if theme === 'light'}
    <Moon class="h-5 w-5" />
  {:else}
    <Sun class="h-5 w-5" />
  {/if}
</Button>
