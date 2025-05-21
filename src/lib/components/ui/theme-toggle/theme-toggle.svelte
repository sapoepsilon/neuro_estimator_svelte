<script lang="ts">
  import { Sun, Moon } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { theme, toggleTheme } from '../../../../stores/themeStore';
</script>

<Button variant="ghost" size="icon" on:click={toggleTheme} aria-label="Toggle theme">
  {#if $theme === 'light'}
    <Moon class="h-5 w-5" />
  {:else}
    <Sun class="h-5 w-5" />
  {/if}
</Button>
