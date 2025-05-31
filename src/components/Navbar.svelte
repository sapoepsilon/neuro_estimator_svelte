<script lang="ts">
  import { user, signOut } from "../stores/authStore";
  export let openLoginDialog = () => {};
</script>

<div class="border-b w-full relative z-50 bg-white">
  <div class="w-full flex h-16 items-center px-6">
    <div class="mr-4 flex">
      <button on:click={() => window.location.hash = '/'} class="flex items-center space-x-2">
        <span class="font-bold text-xl">Estimating Agent</span>
      </button>
    </div>
    
    <div class="flex flex-1 items-center justify-end space-x-4">
      <nav class="flex items-center space-x-2">
        {#if $user}
          <div class="items-center space-x-2 ml-4 hidden md:flex">
            <button 
              on:click={() => signOut()} 
              class="hidden md:inline-flex px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              type="button"
            >
              Sign Out
            </button>
          </div>
        {:else}
          <button 
            on:click={() => openLoginDialog()} 
            class="hidden md:inline-flex px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            type="button"
          >
            Login / Sign Up
          </button>
        {/if}
      </nav>
    </div>
  </div>
</div>
