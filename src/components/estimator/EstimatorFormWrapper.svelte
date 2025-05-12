<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { user } from '../../stores/authStore';
  import EstimatorForm from './EstimatorForm.svelte';
  import EstimateDisplay from './EstimateDisplay.svelte';
  import { MessageSquare, Keyboard } from 'lucide-svelte';
  
  let projectId = null;
  let loading = true;
  let project = null;
  let estimateItems = [];
  let error = null;
  
  // Parse URL parameters to get project ID
  function parseUrlParams() {
    const hash = window.location.hash;
    const queryString = hash.split('?')[1];
    if (!queryString) return null;
    
    const params = new URLSearchParams(queryString);
    return params.get('id');
  }
  
  // Fetch project data
  async function fetchProject() {
    if (!projectId || !$user) return;
    
    try {
      const { data, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      project = data;
      return true;
    } catch (err) {
      console.error('Error fetching project:', err);
      error = 'Failed to load project details';
      return false;
    }
  }
  
  // Fetch estimate items for the project using RPC instead of direct query
  // This approach can bypass problematic RLS policies
  async function fetchEstimateItems() {
    if (!projectId || !$user) return;
    
    try {
      // First try the direct approach with limited columns
    const { data, error } = await supabase
  .rpc('get_project_estimate_items', { project_id_param: projectId })
      
      if (error) throw error;
      
      estimateItems = data || [];
      return true;
    } catch (err) {
      console.error('Error fetching estimate items:', err);
      // If we still have an error, try to continue with empty items
      estimateItems = [];
      error = 'Failed to load estimate items';
      return false;
    }
  }
  
  // Format estimate items for display
  function formatEstimateItemsForDisplay() {
    if (!estimateItems.length) return null;
    
    // Calculate total amount
    const totalAmount = estimateItems.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0);
    }, 0);
    
    // Group items by parent_item_id
    const mainItems = estimateItems.filter(item => !item.is_sub_item);
    const subItems = estimateItems.filter(item => item.is_sub_item);
    
    // Create line items structure
    const lineItems = mainItems.map(item => {
      const itemSubItems = subItems.filter(subItem => subItem.parent_item_id === item.id);
      
      return {
        id: item.id,
        description: item.title,
        quantity: item.quantity,
        unitType: item.unit_type,
        unitPrice: item.unit_price,
        amount: item.amount,
        subItems: itemSubItems.map(subItem => ({
          id: subItem.id,
          description: subItem.title,
          quantity: subItem.quantity,
          unitType: subItem.unit_type,
          unitPrice: subItem.unit_price,
          amount: subItem.amount
        }))
      };
    });
    
    return {
      estimate: {
        title: project?.name || 'Project Estimate',
        currency: estimateItems[0]?.currency || 'USD',
        totalAmount: totalAmount,
        lineItems: lineItems
      }
    };
  }
  
  // Reset to create a new estimate
  function resetEstimate() {
    window.location.hash = '/estimator';
  }
  
  // Load data when both user and projectId are available
  async function loadData() {
    if (!$user || !projectId) return;
    
    loading = true;
    error = null;
    
    try {
      const itemsSuccess = await fetchEstimateItems();
      
      // If both failed, show a general error
      if (!itemsSuccess) {
        error = 'Failed to load project data';
      }
    } catch (err) {
      console.error('Error loading data:', err);
      error = 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }
  
  // Watch for user changes
  $: if ($user && projectId) {
    loadData();
  }
  
  // Handle project selection events from sidebar
  function handleProjectSelected(event) {
    const newProjectId = event.detail.projectId;
    console.log(`Project selected event received: ${newProjectId}`);
    
    // Only reload if it's a different project
    if (newProjectId && newProjectId !== projectId) {
      projectId = newProjectId;
      if ($user) {
        // Reset state and load new data
        estimateItems = [];
        project = null;
        loadData();
      }
    }
  }
  
  // Function to toggle AI sidebar
  function toggleAiSidebar() {
    // Dispatch a custom event to toggle the AI sidebar
    window.dispatchEvent(new CustomEvent('toggleAiSidebar', { 
      detail: { 
        projectId: projectId,
        projectName: project?.name || 'Project'
      }
    }));
  }
  
  // Handle keyboard shortcut (Ctrl+Space)
  function handleKeydown(event) {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      toggleAiSidebar();
    }
  }
  
  // Handle new project creation event
  function handleNewProject() {
    projectId = null;
    project = null;
    estimateItems = [];
    loading = false;
    error = null;
  }
  
  // Handle when a new item is added via EstimateDisplay
  async function handleItemAdded() {
    // Refresh the estimate items data
    await fetchEstimateItems();
  }
  
  // Handle when an item is deleted via EstimateDisplay
  async function handleItemDeleted() {
    // Refresh the estimate items data
    await fetchEstimateItems();
  }

  onMount(() => {
    projectId = parseUrlParams();
    
    // Set up event listeners
    window.addEventListener('projectSelected', handleProjectSelected);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('newProject', handleNewProject);
    
    if (!projectId) {
      loading = false;
    } else if ($user) {
      loadData();
    } else {
      // If no user yet, just set loading to false and wait for user to be available
      setTimeout(() => {
        if (loading && !$user) loading = false;
      }, 2000); // Timeout as a fallback
    }
    
    // Clean up event listeners on component destruction
    return () => {
      window.removeEventListener('projectSelected', handleProjectSelected);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('newProject', handleNewProject);
    };
  });
</script>

<div>
  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 text-red-700 p-4 rounded-md mb-4">
      <p>{error}</p>
    </div>
  {:else if projectId && estimateItems.length > 0}
    <div class="relative">
      <EstimateDisplay 
        result={formatEstimateItemsForDisplay()} 
        onReset={resetEstimate}
        on:itemAdded={handleItemAdded}
        on:itemDeleted={handleItemDeleted}
      />
      
      <!-- AI Estimator Toggle Button -->
      <div class="fixed bottom-6 right-6 flex flex-col items-end space-y-2">
        <div class="bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-2 rounded-md shadow-md flex items-center mb-2">
          <Keyboard class="h-3 w-3 mr-1" />
          <span>Ctrl+K</span>
        </div>
        <button
          class="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
          on:click={toggleAiSidebar}
          aria-label="Toggle AI Estimator"
        >
          <MessageSquare class="h-6 w-6" />
        </button>
      </div>
    </div>
  {:else}
    <div class="relative">
      <EstimatorForm projectId={projectId} projectData={project} />
      
      <!-- AI Estimator Toggle Button -->
      {#if projectId}
        <div class="fixed bottom-6 right-6 flex flex-col items-end space-y-2">
          <div class="bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-2 rounded-md shadow-md flex items-center mb-2">
            <Keyboard class="h-3 w-3 mr-1" />
            <span>Ctrl+Space</span>
          </div>
          <button
            class="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            on:click={toggleAiSidebar}
            aria-label="Toggle AI Estimator"
          >
            <MessageSquare class="h-6 w-6" />
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
