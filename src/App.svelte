<script lang="ts">
  import "./app.css";
  import Navbar from './components/Navbar.svelte';
  import LoginDialog from './components/auth/LoginDialog.svelte';
  import { onMount } from 'svelte';
  import { initializeAuthStore } from './stores/authStore';
  import Router from 'svelte-spa-router';
  import routes from './routes';
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  
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
  <AppSidebar />
  <div class="flex-1 flex flex-col overflow-hidden">
    <Navbar openLoginDialog={openLoginDialog} />
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
