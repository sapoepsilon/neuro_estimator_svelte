<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeTheme } from '../../stores/themeStore';

  onMount(() => {
    // Initialize theme from store
    initializeTheme();
  });
</script>

<slot />
