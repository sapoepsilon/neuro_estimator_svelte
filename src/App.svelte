<script lang="ts">
  import "./app.css";
  import Navbar from './components/Navbar.svelte';
  import LoginDialog from './components/auth/LoginDialog.svelte';
  import WelcomeDialog from './components/WelcomeDialog.svelte';
  import { onMount } from 'svelte';
  import { initializeAuthStore } from './stores/authStore';
  import Router from 'svelte-spa-router';
  import routes from './routes';
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import AiSidebar from "$lib/components/ai-sidebar.svelte";
  import { Toaster } from "$lib/components/ui/sonner";
  import { supabase } from '$lib/supabase';

  import { Menu } from "lucide-svelte";
  
  // Sidebar states
  
  // Sidebar states
  let showMobileSidebar = false;
  let showAiSidebar = false;
  let aiSidebarProjectId = null;
  let aiSidebarProjectName = null;
  
  // No localStorage persistence for AI sidebar
  
  // No reactive state persistence for AI sidebar
  
  // Toggle mobile sidebar
  function toggleMobileSidebar() {
    showMobileSidebar = !showMobileSidebar;
  }
  
  // Function to open AI sidebar
  function openAiSidebar(project) {
    aiSidebarProjectId = project.id;
    aiSidebarProjectName = project.name;
    showAiSidebar = true;
  }
  
  // Reference to the AI sidebar component
  let aiSidebarComponent;
  
  // State for login dialog
  let loginDialogOpen = false;
  
  // State for welcome dialog
  let welcomeDialogOpen = false;
  
  // Function to open login dialog
  function openLoginDialog() {
    loginDialogOpen = true;
  }
  
  // Function to handle dialog open state change
  function handleLoginDialogOpenChange(open: boolean) {
    loginDialogOpen = open;
  }
  
  // Function to handle welcome dialog open state change
  function handleWelcomeDialogOpenChange(open: boolean) {
    welcomeDialogOpen = open;
  }
  
  // Function to handle project selection
  function handleProjectSelected(event) {
    const projectId = event.detail.projectId;
    // Get project details from the URL parameters
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const projectName = urlParams.get('name') || 'Project';
    
    // Open the AI sidebar with the selected project
    aiSidebarProjectId = projectId;
    aiSidebarProjectName = projectName;
    showAiSidebar = true;
  }
  
  // Function to handle AI sidebar toggle
  function handleToggleAiSidebar(event) {
    const { projectId, projectName } = event.detail;
    
    // Toggle the sidebar visibility
    showAiSidebar = !showAiSidebar;
    
    // If opening, update the project details
    if (showAiSidebar) {
      aiSidebarProjectId = projectId;
      aiSidebarProjectName = projectName;
      // Dispatch event to notify that sidebar is opened
      window.dispatchEvent(new CustomEvent('aiSidebarOpened'));
    }
  }
  
  // Function to explicitly hide the AI sidebar
  function handleHideAiSidebar() {
    showAiSidebar = false;
  }
  
  // Initialize auth store and set up event listeners on mount
  onMount(async () => {
    // Initialize auth store
    await initializeAuthStore();
    
    // Get the current session to check if user is authenticated
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // If no session exists, open the login dialog for new users
      loginDialogOpen = true;
    }
    
    // Listen for project selection events
    window.addEventListener('projectSelected', handleProjectSelected);
    
    // Listen for AI sidebar toggle events
    window.addEventListener('toggleAiSidebar', handleToggleAiSidebar);
    
    // Listen for hide AI sidebar events
    window.addEventListener('hideAiSidebar', handleHideAiSidebar);
    
    return () => {
      window.removeEventListener('projectSelected', handleProjectSelected);
      window.removeEventListener('toggleAiSidebar', handleToggleAiSidebar);
      window.removeEventListener('hideAiSidebar', handleHideAiSidebar);
    };
  });
</script>


  <div class="flex h-screen w-full overflow-hidden">
    <AppSidebar bind:sidebarVisible={showMobileSidebar} {openLoginDialog} />
    <div class="flex-1 flex flex-col overflow-hidden relative">
      <div class="flex items-center relative z-50">
        <button 
          class="md:hidden p-2 m-2 rounded-md hover:bg-slate-100" 
          on:click={toggleMobileSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu class="h-6 w-6" />
        </button>
        <Navbar openLoginDialog={openLoginDialog} />
      </div>
      <div class="flex-1 flex overflow-hidden">
        <main class="flex-1 overflow-auto">
          <Router {routes} />
        </main>
        <AiSidebar 
          bind:open={showAiSidebar} 
          bind:projectId={aiSidebarProjectId} 
          bind:projectName={aiSidebarProjectName} 
          bind:this={aiSidebarComponent}
        />
      </div>
    </div>
  </div>


<LoginDialog 
  open={loginDialogOpen} 
  onOpenChange={handleLoginDialogOpenChange} 
/>

<WelcomeDialog
  bind:open={welcomeDialogOpen}
  onOpenChange={handleWelcomeDialogOpenChange}
/>

<Toaster />

<style>
  /* Global styles can be added here */
</style>
