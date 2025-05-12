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
  
  function parseUrlParams() {
    const hash = window.location.hash;
    const queryString = hash.split('?')[1];
    if (!queryString) return null;
    
    const params = new URLSearchParams(queryString);
    return params.get('id');
  }
  
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
  
  async function fetchEstimateItems() {
    if (!projectId || !$user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_project_estimate_items', { project_id_param: projectId })
      
      if (error) throw error;
      
      estimateItems = data || [];
      return true;
    } catch (err) {
      estimateItems = [];
      error = 'Failed to load estimate items';
      return false;
    }
  }
  
  function formatEstimateItemsForDisplay() {
    if (!estimateItems.length) return null;
    
    const totalAmount = estimateItems.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0);
    }, 0);
    const mainItems = estimateItems.filter(item => !item.is_sub_item);
    const subItems = estimateItems.filter(item => item.is_sub_item);
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
  
  async function loadData() {
    if (!$user || !projectId) return;
    
    loading = true;
    error = null;
    
    try {
      const itemsSuccess = await fetchEstimateItems();
      
      if (!itemsSuccess) {
        error = 'Failed to load project data';
      }
    } catch (err) {
      error = 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }
  
  $: if ($user && projectId) {
    loadData();
  }
  function handleProjectSelected(event) {
    const newProjectId = event.detail.projectId;
    
    if (newProjectId && newProjectId !== projectId) {
      projectId = newProjectId;
      if ($user) {
        estimateItems = [];
        project = null;
        loadData();
      }
    }
  }
  
  let isAiSidebarVisible = false;

  function toggleAiSidebar() {
    isAiSidebarVisible = !isAiSidebarVisible;
    window.dispatchEvent(new CustomEvent('toggleAiSidebar', { 
      detail: { 
        projectId: projectId,
        projectName: project?.name || 'Project'
      }
    }));
  }
  
  onMount(() => {
    const handleSidebarClose = () => {
      isAiSidebarVisible = false;
    };
    
    window.addEventListener('aiSidebarClosed', handleSidebarClose);
    
    return () => {
      window.removeEventListener('aiSidebarClosed', handleSidebarClose);
    };
  });
  
  function handleKeydown(event) {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      toggleAiSidebar();
    }
  }
  
  function handleNewProject() {
    projectId = null;
    project = null;
    estimateItems = [];
    loading = false;
    error = null;
  }
  
  async function handleItemAdded() {
    await fetchEstimateItems();
  }
  
  async function handleItemDeleted() {
    await fetchEstimateItems();
  }

  onMount(() => {
    projectId = parseUrlParams();
    
    window.addEventListener('projectSelected', handleProjectSelected);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('newProject', handleNewProject);
    
    if (!projectId) {
      loading = false;
    } else if ($user) {
      loadData();
    } else {
      setTimeout(() => {
        if (loading && !$user) loading = false;
      }, 2000); // Timeout as a fallback
    }
    
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
        on:itemAdded={handleItemAdded}
        on:itemDeleted={handleItemDeleted}
      />
      
      {#if !isAiSidebarVisible}
      <div class="fixed bottom-6 right-6 flex flex-col items-end space-y-2 z-[999]" style="pointer-events: auto;">
        <div class="bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-2 rounded-md shadow-md flex items-center mb-2">
          <Keyboard class="h-3 w-3 mr-1" />
          <span>Ctrl+K</span>
        </div>
        <button
          class="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-[100] cursor-pointer"
          on:click={toggleAiSidebar}
          aria-label="Toggle AI Estimator"
          style="pointer-events: auto;"
        >
          <MessageSquare class="h-6 w-6" />
        </button>
      </div>
      {/if}
    </div>
  {:else}
    <div class="relative">
      <EstimatorForm projectId={projectId} projectData={project} />
      
      {#if projectId}
        {#if !isAiSidebarVisible}
        <div class="fixed bottom-6 right-6 flex flex-col items-end space-y-2 z-[999]" style="pointer-events: auto;">
          <div class="bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-2 rounded-md shadow-md flex items-center mb-2">
            <Keyboard class="h-3 w-3 mr-1" />
            <span>Ctrl+K</span>
          </div>
          <button
            class="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-[100] cursor-pointer"
            on:click={toggleAiSidebar}
            aria-label="Toggle AI Estimator"
            style="pointer-events: auto;"
          >
            <MessageSquare class="h-6 w-6" />
          </button>
        </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
