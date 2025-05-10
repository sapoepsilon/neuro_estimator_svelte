<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { user, signOut } from "../stores/authStore";
  
  // Props
  export let openLoginDialog = () => {};
</script>

<div class="border-b">
  <div class="container flex h-16 items-center px-4">
    <div class="mr-4 flex">
      <a href="/" class="flex items-center space-x-2">
        <span class="font-bold text-xl">Neuro Estimator</span>
      </a>
    </div>
    <div class="flex flex-1 items-center justify-end space-x-4">
      <nav class="flex items-center space-x-2">
        {#if $user}
          <div class="flex items-center space-x-2">
            <span class="text-sm text-muted-foreground">
              {$user.email}
            </span>
            <Button variant="outline" size="sm" on:click={signOut}>
              Sign Out
            </Button>
          </div>
        {:else}
          <Button variant="outline" size="sm" on:click={openLoginDialog}>
            Login / Sign Up
          </Button>
        {/if}
      </nav>
    </div>
  </div>
</div>
