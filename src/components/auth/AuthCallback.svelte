<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { supabase } from '../../lib/supabase';

  let error = null;
  let message = "Processing authentication...";

  onMount(async () => {
    console.log("Auth callback mounted, processing URL:", window.location.href);
    
    try {
      // Extract hash and search parameters
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash || window.location.search);
      
      console.log("Auth parameters:", {
        access_token: params.get('access_token') ? 'present' : 'absent',
        refresh_token: params.get('refresh_token') ? 'present' : 'absent',
        type: params.get('type'),
        error_description: params.get('error_description')
      });
      
      // Check if this is a Supabase auth callback
      if (params.get('access_token') || params.get('refresh_token') || params.get('error_description')) {
        // If there's an error in the URL parameters, display it
        if (params.get('error_description')) {
          error = params.get('error_description');
          message = "Authentication failed";
          console.error("Auth error from URL:", error);
          return;
        }
        
        // Handle the session
        const { data, error: authError } = await supabase.auth.getSession();
        console.log("Session data:", data ? "present" : "absent", "Error:", authError ? authError.message : "none");
        
        if (authError) {
          error = authError.message;
          message = "Authentication failed";
          console.error("Auth session error:", error);
        } else if (data?.session) {
          message = "Authentication successful!";
          console.log("Authentication successful, redirecting to home");
          // Redirect to home page after a short delay
          setTimeout(() => {
            push('/');
          }, 2000);
        } else {
          // If we have tokens but no session, try to set the session manually
          if (params.get('access_token')) {
            console.log("Attempting to set session from URL parameters");
            try {
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: params.get('access_token'),
                refresh_token: params.get('refresh_token') || ''
              });
              
              if (sessionError) {
                error = sessionError.message;
                message = "Failed to set authentication session";
                console.error("Set session error:", error);
              } else {
                message = "Authentication successful!";
                console.log("Session set successfully, redirecting to home");
                // Redirect to home page after a short delay
                setTimeout(() => {
                  push('/');
                }, 2000);
              }
            } catch (sessionErr) {
              error = sessionErr.message;
              message = "Error setting session";
              console.error("Set session exception:", error);
            }
          } else {
            message = "No valid authentication data found";
            console.error("No valid auth data in response");
          }
        }
      } else {
        // Not a valid auth callback
        message = "Invalid authentication callback";
        console.error("Not a valid auth callback URL");
        // Redirect to home page after a short delay
        setTimeout(() => {
          push('/');
        }, 2000);
      }
    } catch (err) {
      error = err.message;
      message = "An error occurred during authentication";
      console.error("Auth callback exception:", err);
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
