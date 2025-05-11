<script lang="ts">
  import { Home, FolderKanban, Settings, Plus, ChevronRight, ChevronLeft, Menu, LogIn, LogOut, MessageSquare, GripVertical } from "lucide-svelte";
  import { onMount } from 'svelte';
  import { user, signOut } from "../../stores/authStore";
  import { supabase } from "$lib/supabase";
  import AgentChat from "$lib/components/ai-agent/agent-chat.svelte";
  
  // Sidebar state
  let collapsed = false;
  let isMobile = false;
  export let sidebarVisible = false;
  
  // Get saved width from localStorage or use default
  const STORAGE_KEY = 'neuro-estimator-sidebar-width';
  let widthPx = collapsed ? 64 : 250;
  
  // Function to check if we're in a browser environment
  const isBrowser = () => typeof window !== 'undefined';
  
  // Initialize width from localStorage if available
  let initialWidthLoaded = false;
  
  let width = `${widthPx}px`;
  
  // Resize state
  let isResizing = false;
  let minWidth = 180; // Minimum width in pixels
  let maxWidth = 500; // Maximum width in pixels
  let startX: number;
  let startWidth: number;
  
  // Mode state (regular or agent)
  let mode = "regular";
  let selectedProject = null;
  let selectedProjectName = null;
  
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
      widthPx = collapsed ? 64 : 250;
      width = `${widthPx}px`;
    }
  }
  
  // Resize handlers
  function startResize(event: MouseEvent) {
    if (collapsed || isMobile) return;
    
    isResizing = true;
    startX = event.clientX;
    startWidth = widthPx;
    
    // Add event listeners for resize
    window.addEventListener('mousemove', handleResize, { passive: true });
    window.addEventListener('mouseup', stopResize);
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    
    // Disable pointer events on other elements to improve performance
    document.body.style.pointerEvents = 'none';
  }
  
  // Use requestAnimationFrame for smoother updates
  let animationFrameId: number | null = null;
  
  function handleResize(event: MouseEvent) {
    if (!isResizing) return;
    
    // Cancel any pending animation frame
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Schedule the update on the next animation frame
    animationFrameId = requestAnimationFrame(() => {
      const diffX = event.clientX - startX;
      let newWidth = startWidth + diffX;
      
      // Enforce min and max width
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      widthPx = newWidth;
      width = `${widthPx}px`;
      
      animationFrameId = null;
    });
  }
  
  function stopResize() {
    isResizing = false;
    
    // Cancel any pending animation frame
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    // Remove event listeners
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', stopResize);
    
    // Restore text selection and pointer events
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
    
    // Save width to localStorage
    if (isBrowser() && !collapsed) {
      try {
        localStorage.setItem(STORAGE_KEY, widthPx.toString());
      } catch (e) {
        console.error('Failed to save sidebar width to localStorage:', e);
      }
    }
  }
  
  // Hide sidebar when clicking on a link (mobile only)
  function handleLinkClick(event) {
    // Log the link being clicked
    const href = event.currentTarget.getAttribute('href');
    console.log(`Link clicked: ${href}`);
    
    if (isMobile) {
      sidebarVisible = false;
    }
    
    // If this is a project link, ensure we're properly navigating
    if (href && href.includes('/estimator?id=')) {
      const projectId = href.split('=')[1];
      console.log(`Navigating to project ID: ${projectId}`);
      
      // Force a reload to ensure the estimate data is loaded
      // First navigate to the URL
      window.location.hash = href;
      
      // Dispatch a custom event that the EstimatorFormWrapper can listen for
      window.dispatchEvent(new CustomEvent('projectSelected', { 
        detail: { projectId }
      }));
      
      // Prevent default navigation since we're handling it manually
      event.preventDefault();
    }
  }
  
  // Function to switch to AI agent mode
  function switchToAgentMode(project) {
    selectedProject = project.id;
    selectedProjectName = project.name;
    mode = "agent";
  }
  
  // Function to switch back to regular mode
  function switchToRegularMode() {
    mode = "regular";
  }
  
  // Set up event listeners
  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Load saved width from localStorage on mount
    if (isBrowser() && !initialWidthLoaded) {
      try {
        const savedWidth = localStorage.getItem(STORAGE_KEY);
        if (savedWidth && !collapsed) {
          widthPx = parseInt(savedWidth, 10);
          width = `${widthPx}px`;
        }
        initialWidthLoaded = true;
      } catch (e) {
        console.error('Failed to load sidebar width from localStorage:', e);
      }
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      // Clean up resize listeners if component is destroyed while resizing
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
      
      // Cancel any pending animation frame
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
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
  class="h-full flex flex-col border-r bg-background {isResizing ? '' : 'transition-all duration-300 ease-in-out'} {isMobile ? 'fixed z-40 left-0 top-0 bottom-0' : ''} relative" 
  style="{isMobile ? 'width: 250px' : `width: ${width}; min-width: ${width}; max-width: ${width};`}"
  class:hidden={isMobile && !sidebarVisible}
>
  
  <!-- Full-height resize handle (only visible when not collapsed and not on mobile) -->
  {#if !collapsed && !isMobile}
    <button 
      class="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-primary/20 active:bg-primary/40 z-20 border-0 p-0 m-0 bg-transparent flex items-center justify-center transition-colors duration-150 {isResizing ? 'bg-primary/30' : ''}"
      on:mousedown={startResize}
      aria-label="Resize sidebar"
      tabindex="0"
    >
      <div class="h-full w-[2px] bg-gray-300 rounded-full opacity-30 hover:opacity-80"></div>
      <span class="sr-only">Drag to resize sidebar</span>
    </button>
  {/if}
  {#if mode === "agent"}
    <!-- AI Agent Chat Mode -->
    <AgentChat 
      onBackToRegularMode={switchToRegularMode} 
      projectId={selectedProject}
      projectName={selectedProjectName}
    />
  {:else}
    <!-- Regular Sidebar Mode -->
    <!-- Header -->
    <div class="p-4 border-b flex items-center justify-between relative">
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
            <li class="relative group">
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
              <!-- AI Agent button -->
              {#if !collapsed || isMobile}
                <button 
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-opacity"
                  on:click={() => switchToAgentMode(project)}
                  title="Open AI agent for this project"
                >
                  <MessageSquare class="h-4 w-4 text-slate-600" />
                </button>
              {/if}
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
  {/if}
</div>
