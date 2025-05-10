<script lang="ts">
  import "./app.css";
  import EstimatorForm from './components/estimator/EstimatorForm.svelte';
  import Navbar from './components/Navbar.svelte';
  import LoginDialog from './components/auth/LoginDialog.svelte';
  import { onMount } from 'svelte';
  import { initializeAuthStore } from './stores/authStore';
  
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

<Navbar openLoginDialog={openLoginDialog} />

<main class="min-h-screen bg-slate-50">
  <div class="container mx-auto py-8">
    <EstimatorForm />
  </div>
</main>

<LoginDialog 
  open={loginDialogOpen} 
  onOpenChange={handleLoginDialogOpenChange} 
/>

<style>
  /* Global styles can be added here */
</style>
