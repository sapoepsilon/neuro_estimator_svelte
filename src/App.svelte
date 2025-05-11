<script lang="ts">
  import "./app.css";
  import Navbar from './components/Navbar.svelte';
  import LoginDialog from './components/auth/LoginDialog.svelte';
  import { onMount } from 'svelte';
  import { initializeAuthStore } from './stores/authStore';
  import Router from 'svelte-spa-router';
  import routes from './routes';
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { Menu } from "lucide-svelte";
  
  // Mobile sidebar state
  let showMobileSidebar = false;
  
  // Toggle mobile sidebar
  function toggleMobileSidebar() {
    showMobileSidebar = !showMobileSidebar;
  }
  
  // State for login dialog
  let loginDialogOpen = false;
  
  // Function to open login dialog
  function openLoginDialog() {
    loginDialogOpen = true;
  }
  
  // Function to handle dialog open state change
  function handleLoginDialogOpenChange(open: boolean) {
    loginDialogOpen = open;
  }
  
  // Initialize auth store on mount
  onMount(() => {
    initializeAuthStore();
  });
</script>

<div class="flex h-screen w-full overflow-hidden">
  <AppSidebar bind:sidebarVisible={showMobileSidebar} {openLoginDialog} />
  <div class="flex-1 flex flex-col overflow-hidden relative">
    <div class="flex items-center">
      <button 
        class="md:hidden p-2 m-2 rounded-md hover:bg-slate-100" 
        on:click={toggleMobileSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu class="h-6 w-6" />
      </button>
      <Navbar openLoginDialog={openLoginDialog} />
    </div>
    <main class="flex-1 overflow-auto bg-slate-50">
      <Router {routes} />
    </main>
  </div>
</div>

<LoginDialog 
  open={loginDialogOpen} 
  onOpenChange={handleLoginDialogOpenChange} 
/>

<style>
  /* Global styles can be added here */
</style>
