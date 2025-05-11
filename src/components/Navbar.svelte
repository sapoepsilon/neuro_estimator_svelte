<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { user, signOut } from "../stores/authStore";;
  
  // Props
  export let openLoginDialog = () => {};
  
  function createNewProject() {
    window.location.hash = '/estimator';
  }
</script>

<div class="border-b w-full">
  <div class="w-full flex h-16 items-center px-6">
    <div class="mr-4 flex">
      <button on:click={() => window.location.hash = '/'} class="flex items-center space-x-2">
        <span class="font-bold text-xl">Neuro Estimator</span>
      </button>
    </div>
    
    <div class="flex flex-1 items-center justify-end space-x-4">
      <nav class="flex items-center space-x-2">
        {#if $user}
          <Button variant="default" size="sm" on:click={createNewProject}>
            Create a new project
          </Button>
         
          <div class="flex items-center space-x-2 ml-4">
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
