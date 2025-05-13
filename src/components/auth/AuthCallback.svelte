<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { supabase } from '../../lib/supabase';

  let error = null;
  let message = "Processing authentication...";

  onMount(async () => {
    // Get the URL hash parameters
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search);
    
    try {
      // Check if this is a Supabase auth callback
      if (params.get('access_token') || params.get('refresh_token') || params.get('error_description')) {
        // Handle the callback
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          error = authError.message;
          message = "Authentication failed";
        } else {
          message = "Authentication successful!";
          // Redirect to home page after a short delay
          setTimeout(() => {
            push('/');
          }, 2000);
        }
      } else {
        // Not a valid auth callback
        message = "Invalid authentication callback";
        // Redirect to home page after a short delay
        setTimeout(() => {
          push('/');
        }, 2000);
      }
    } catch (err) {
      error = err.message;
      message = "An error occurred during authentication";
    }
  });
</script>

<div class="auth-callback-container">
  <h2>{message}</h2>
  {#if error}
    <p class="error">{error}</p>
  {/if}
  <p>Redirecting you shortly...</p>
</div>

<style>
  .auth-callback-container {
    max-width: 600px;
    margin: 100px auto;
    padding: 2rem;
    text-align: center;
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .error {
    color: #e53e3e;
    margin-top: 1rem;
  }
</style>
