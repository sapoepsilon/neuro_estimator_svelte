<script lang="ts">
  import { Home, FolderKanban, Settings, Plus, ChevronRight, ChevronLeft, Menu, LogIn, LogOut } from "lucide-svelte";
  import { onMount } from 'svelte';
  import { user, signOut } from "../../stores/authStore";
  import { supabase } from "$lib/supabase";
  
  // Sidebar state
  let collapsed = false;
  let isMobile = false;
  export let sidebarVisible = false;
  let width = collapsed ? "64px" : "250px";
  
  // Props
  export let openLoginDialog = () => {};
  
  // Projects data from database
  let projects = [];

  const getProjects = async () => {
    if (!$user) {
      console.log('User not yet authenticated or initialized');
      return [];
    }
    
    console.log(`User ID: ${$user.id}`);
    try {
      // Use a direct SQL query with rpc to bypass RLS policies
      const { data, error } = await supabase.rpc('get_user_projects', {
        user_id_param: $user.id
      });
      
      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
      
      console.log(`Projects: ${JSON.stringify(data)}`);
      return data;
    } catch (err) {
      console.error('Exception fetching projects:', err);
      return [];
    }
  }
  
  // Move project fetching to onMount to ensure auth is initialized
  onMount(() => {
    // Subscribe to user store changes
    const unsubscribe = user.subscribe(async currentUser => {
      if (currentUser) {
        projects = await getProjects();
      }
    });
    
    return () => {
      unsubscribe();
    };
  })
  
  // Navigation items
  const navItems = [
    {
      title: "Home",
      url: "#/",
      icon: Home
    }
  ];
  
  // Check if device is mobile
  function checkMobile() {
    isMobile = window.innerWidth < 768;
    // On mobile, sidebar should NOT be collapsed (to show text)
    if (isMobile) {
      collapsed = false;
      // But it should be hidden by default
      if (!sidebarVisible) {
        sidebarVisible = false;
      }
    }
  }
  
  function createNewProject() {
    window.location.hash = '/estimator';
    if (isMobile) {
      sidebarVisible = false;
    }
  }
  
  function toggleSidebar() {
    if (isMobile) {
      sidebarVisible = !sidebarVisible;
    } else {
      collapsed = !collapsed;
      width = collapsed ? "64px" : "250px";
    }
  }
  
  // Hide sidebar when clicking on a link (mobile only)
  function handleLinkClick() {
    if (isMobile) {
      sidebarVisible = false;
    }
  }
  
  // Set up event listeners
  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });
</script>

<!-- Mobile overlay to close sidebar when clicking outside -->
{#if isMobile && sidebarVisible}
  <button 
    class="fixed inset-0 bg-black/20 z-30 border-0" 
    on:click={() => sidebarVisible = false}
    on:keydown={(e) => e.key === 'Escape' && (sidebarVisible = false)}
    aria-label="Close sidebar"
  ></button>
{/if}

<div 
  class="h-full flex flex-col border-r bg-background transition-all duration-300 ease-in-out {isMobile ? 'fixed z-40 left-0 top-0 bottom-0' : ''}" 
  style="{isMobile ? 'width: 250px' : `width: ${width}; min-width: ${width}; max-width: ${width};`}"
  class:hidden={isMobile && !sidebarVisible}
>
  <!-- Header -->
  <div class="p-4 border-b flex items-center justify-between">
    {#if !collapsed}
      <h2 class="text-lg font-semibold">Neuro Estimator</h2>
    {/if}
    <button 
      class="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" 
      on:click={toggleSidebar}
    >
      {#if collapsed}
        <ChevronRight class="h-5 w-5" />
      {:else}
        <ChevronLeft class="h-5 w-5" />
      {/if}
    </button>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-auto py-2">
    <!-- Navigation Section -->
    <div class="px-3 py-2">
      {#if !collapsed || isMobile}
        <h3 class="mb-2 px-2 text-xs font-semibold text-slate-500">Navigation</h3>
      {/if}
      <nav>
        <ul class="space-y-1">
          {#each navItems as item}
            <li>
              <a 
                href={item.url} 
                class="flex items-center px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                on:click={handleLinkClick}
              >
                <svelte:component this={item.icon} class="h-5 w-5 text-slate-600" />
                {#if !collapsed || isMobile}
                  <span class="ml-3 text-sm">{item.title}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
    
    <!-- Projects Section -->
    <div class="mt-6 px-3 py-2">
      <div class="flex items-center justify-between mb-2 px-2">
        {#if !collapsed || isMobile}
          <h3 class="text-xs font-semibold text-slate-500">Projects</h3>
          <button 
            class="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" 
            on:click={createNewProject}
            title="Create new project"
          >
            <Plus class="h-4 w-4 text-slate-600" />
          </button>
        {:else}
          <button 
            class="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mx-auto" 
            on:click={createNewProject}
            title="Create new project"
          >
            <Plus class="h-4 w-4 text-slate-600" />
          </button>
        {/if}
      </div>
      <nav>
        <ul class="space-y-1">
          {#each projects as project}
            <li>
              <a 
                href={`#/estimator?id=${project.id}`} 
                class="flex items-center px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                on:click={handleLinkClick}
              >
                <FolderKanban class="h-5 w-5 text-slate-600" />
                {#if !collapsed || isMobile}
                  <span class="ml-3 text-sm truncate">{project.name}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
  </div>
  
  <!-- Footer -->
  <div class="p-4 border-t text-slate-500">
    {#if isMobile}
      <div class="mb-4 relative z-50"> <!-- Increased z-index to ensure buttons are clickable -->
        {#if $user}
          <button 
            class="w-full mb-2 py-2 px-4 border border-gray-300 rounded-md flex items-center justify-center text-sm hover:bg-gray-100" 
            on:click={() => { createNewProject(); sidebarVisible = false; }}
          >
            <Plus class="h-4 w-4 mr-2" />
            Create a new project
          </button>
          <button 
            class="w-full py-2 px-4 border border-gray-300 rounded-md flex items-center justify-center text-sm hover:bg-gray-100" 
            on:click={() => { signOut(); sidebarVisible = false; }}
          >
            <LogOut class="h-4 w-4 mr-2" />
            Sign Out
          </button>
        {:else}
          <button 
            class="w-full py-2 px-4 border border-gray-300 rounded-md flex items-center justify-center text-sm hover:bg-gray-100" 
            on:click={() => { openLoginDialog(); sidebarVisible = false; }}
          >
            <LogIn class="h-4 w-4 mr-2" />
            Login / Sign Up
          </button>
        {/if}
      </div>
    {/if}
    
    {#if !collapsed || isMobile}
      <p class="text-xs">Neuro Estimator v0.0.1 Alpha</p>
    {/if}
  </div>
</div>
