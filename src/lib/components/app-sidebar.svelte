<script lang="ts">
  import { Home, FolderKanban, Settings, Plus, ChevronRight, ChevronLeft, Menu, LogIn, LogOut, MessageSquare, GripVertical } from "lucide-svelte";
  import { onMount } from 'svelte';
  import { user, signOut } from "../../stores/authStore";
  import { supabase } from "$lib/supabase";

  
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
  

  
  // Props
  export let openLoginDialog = () => {};
  
  // Projects data from database
  let projects = [];

  const getProjects = async () => {
    if (!$user) {
      return [];
    }
    
    try {
      // Use a direct SQL query with rpc to bypass RLS policies
      const { data, error } = await supabase.rpc('get_user_projects', {
        user_id_param: $user.id
      });
      
      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
      
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
      } else {
        projects = [];
      }
    });
    
    return () => {
      unsubscribe();
    };
  })
  
  // Watch for sidebar visibility changes to ensure projects are loaded when sidebar opens
  $: if (sidebarVisible && $user) {
    // Use a small timeout to ensure this runs after the sidebar animation starts
    setTimeout(async () => {
      if (projects.length === 0) {
        projects = await getProjects();
      }
    }, 50);
  }
  
  // Navigation items
  const navItems = [
    {
      title: "Home",
      url: "#/",
      icon: Home
    }
  ];
  
  function checkMobile() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 768;
    if (isMobile) {
      collapsed = false;
      if (!wasMobile && isMobile) {
        sidebarVisible = false;
      }
    } else if (wasMobile && !isMobile) {
      sidebarVisible = true;
    }
  }
  
  function createNewProject() {
    window.location.hash = '/estimator';
    window.dispatchEvent(new CustomEvent('newProject'));
    window.dispatchEvent(new CustomEvent('hideAiSidebar'));
    if (isMobile) {
      sidebarVisible = false;
    }
  }
  
  async function toggleSidebar() {
    if (isMobile) {
      sidebarVisible = !sidebarVisible;
      if (sidebarVisible) {
        document.body.style.overflow = 'hidden';
        if ($user && projects.length === 0) {
          projects = await getProjects();
        }
      } else {
        document.body.style.overflow = '';
      }
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
    const href = event.currentTarget.getAttribute('href');
    if (isMobile) {
      sidebarVisible = false;
    }
    
    if (href && href.includes('/estimator?id=')) {
      const projectId = href.split('=')[1];
      window.location.hash = href;
      window.dispatchEvent(new CustomEvent('projectSelected', { 
        detail: { projectId }
      }));
      event.preventDefault();
    }
  }
  

  
  // Set up event listeners
  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Add escape key listener for closing sidebar on mobile
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isMobile && sidebarVisible) {
        sidebarVisible = false;
        document.body.style.overflow = '';
      }
    };
    
    window.addEventListener('keydown', handleEscKey);
    
    // Add swipe detection for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    
    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };
    
    const handleSwipe = () => {
      // Detect left swipe to close sidebar
      if (isMobile && sidebarVisible && touchEndX < touchStartX - 50) {
        sidebarVisible = false;
        document.body.style.overflow = '';
      }
    };
    
    if (isBrowser()) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
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
      window.removeEventListener('keydown', handleEscKey);
      
      if (isBrowser()) {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      }
      
      // Clean up resize listeners if component is destroyed while resizing
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
      
      // Cancel any pending animation frame
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Restore body overflow
      document.body.style.overflow = '';
    };
  });
</script>

<!-- Mobile overlay to close sidebar when clicking outside -->
{#if isMobile && sidebarVisible}
  <div 
    class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out"
    on:click={() => sidebarVisible = false}
    on:keydown={(e) => e.key === 'Escape' && (sidebarVisible = false)}
    role="button"
    tabindex="-1"
    aria-label="Close sidebar"
  ></div>
{/if}

<div 
  class="h-full flex flex-col border-r bg-background shadow-lg {isResizing ? '' : 'transition-all duration-300 ease-in-out'} {isMobile ? 'fixed z-50 top-0 bottom-0 max-h-screen overflow-hidden' : 'relative'}"
  style="{isMobile ? `width: 280px; transform: translateX(${sidebarVisible ? '0' : '-100%'})` : `width: ${width}; min-width: ${width}; max-width: ${width};`}"
>
  
  <!-- Full-height resize handle (only visible when not collapsed and not on mobile) -->
  {#if !collapsed && !isMobile}
    <button 
      class="absolute right-0 top-0 bottom-0 w-0.1 cursor-ew-resize hover:bg-primary/20 active:bg-primary/40 z-20 border-0 p-0 m-0 bg-transparent flex items-center justify-center transition-colors duration-150 {isResizing ? 'bg-primary/30' : ''}"
      on:mousedown={startResize}
      aria-label="Resize sidebar"
      tabindex="0"
    >
      <div class="h-full w-[2px] bg-gray-300 rounded-full opacity-30 hover:opacity-80"></div>
      <span class="sr-only">Drag to resize sidebar</span>
    </button>
  {/if}

    <!-- Regular Sidebar Mode -->
    <!-- Header -->
    <div class="p-4 border-b flex items-center justify-between relative">
      {#if !collapsed}
        <h2 class="text-lg font-semibold">Estimating Agent</h2>
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
      <p class="text-xs">Estimating Agent v0.0.1 Alpha</p>
    {/if}
    </div>
</div>
