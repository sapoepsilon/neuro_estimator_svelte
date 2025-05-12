<script lang="ts">
  import EstimateDisplay from './estimator/EstimateDisplay.svelte';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { user } from '../stores/authStore';
  
  // Sample data for demonstration
  const sampleResult = {
    estimate: {
      title: 'Sample Estimate',
      currency: 'USD',
      totalAmount: 0,
      lineItems: []
    }
  };
  
  let loading = true;
  
  // Function to get the user's projects
  const getLatestProject = async () => {
    if (!$user) {
      loading = false;
      return null;
    }
    
    try {
      // Get user projects ordered by creation date (newest first)
      const { data, error } = await supabase.rpc('get_user_projects', {
        user_id_param: $user.id
      });
      
      if (error) {
        console.error('Error fetching projects:', error);
        loading = false;
        return null;
      }
      
      // If projects exist, return the latest one (first in the array)
      if (data && data.length > 0) {
        return data[0];
      }
      
      return null;
    } catch (err) {
      console.error('Exception fetching projects:', err);
      loading = false;
      return null;
    }
  };
  
  // Function to redirect to the latest project
  const redirectToLatestProject = async () => {
    const latestProject = await getLatestProject();
    
    if (latestProject) {
      console.log(`Redirecting to latest project: ${latestProject.id}`);
      window.location.hash = `/estimator?id=${latestProject.id}`;
      
      // Dispatch project selected event
      window.dispatchEvent(new CustomEvent('projectSelected', { 
        detail: { projectId: latestProject.id }
      }));
    }
    
    loading = false;
  };
  
  onMount(() => {
    // Check for latest project and redirect if found
    redirectToLatestProject();
  });
</script>


  <div class="mx-auto">
    {#if loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow-md p-6">
        <EstimateDisplay result={sampleResult} />
      </div>
    {/if}
  </div>
