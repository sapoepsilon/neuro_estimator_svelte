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
  let projectColumns = [];
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
    
    console.log(`Fetching estimate items for project ID: ${projectId}`);
    
    try {
      // First fetch columns for this project
      const { data: columns, error: columnsError } = await supabase
        .from('estimate_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');
      
      if (columnsError) throw columnsError;
      
      // Then fetch all estimate items
      const { data: items, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('project_id', projectId);
      
      if (itemsError) throw itemsError;
      
      // Group items by row_number
      const groupedItems = {};
      items.forEach(item => {
        if (!groupedItems[item.row_number]) {
          groupedItems[item.row_number] = {
            row_number: item.row_number,
            id: `row-${item.row_number}` // Create a unique id for the row
          };
        }
        
        // Find the column name for this item
        const column = columns.find(col => col.id === item.column_id);
        if (column) {
          groupedItems[item.row_number][column.column_name] = item.value;
        }
      });
      
      // Convert to array
      estimateItems = Object.values(groupedItems);
      projectColumns = columns;
      
      console.log(`Estimate items fetched:`, estimateItems);
      return true;
    } catch (err) {
      console.error('Error fetching estimate items:', err);
      estimateItems = [];
      error = 'Failed to load estimate items';
      return false;
    }
  }
  
  function formatEstimateItemsForDisplay() {
    if (!estimateItems.length) return null;
    
    // Calculate total amount from the amount column values
    const totalAmount = estimateItems.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0);
    }, 0);
    
    // Since we don't have sub-items in the new structure, all items are main items
    const lineItems = estimateItems.map(item => {
      return {
        ...item, // This includes row_number and all column values
        subItems: [] // No sub-items in the new structure
      };
    });
    
    return {
      estimate: {
        title: project?.name || 'Project Estimate',
        currency: estimateItems[0]?.currency || 'USD',
        totalAmount: totalAmount,
        lineItems: lineItems,
        projectColumns: projectColumns,
        project: project
      }
    };
  }
  
  async function loadData() {
    if (!$user || !projectId) return;
    
    loading = true;
    error = null;
    
    try {
      const projectSuccess = await fetchProject();
      const itemsSuccess = await fetchEstimateItems();
      
      if (!projectSuccess || !itemsSuccess) {
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
        loadData().then(() => {
          // Open AI sidebar after data is loaded
          openAiSidebar();
        });
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
  
  function openAiSidebar() {
    isAiSidebarVisible = true;
    window.dispatchEvent(new CustomEvent('openAiSidebar', { 
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
    
    const handleSidebarOpen = () => {
      isAiSidebarVisible = true;
    };
    
    window.addEventListener('aiSidebarClosed', handleSidebarClose);
    window.addEventListener('aiSidebarOpened', handleSidebarOpen);
    
    return () => {
      window.removeEventListener('aiSidebarClosed', handleSidebarClose);
      window.removeEventListener('aiSidebarOpened', handleSidebarOpen);
    };
  });
  
  function handleKeydown(event) {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      openAiSidebar();
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

  // Reference to the EstimateDisplay component
  let estimateDisplayComponent;
  
  // Handler for AI estimate updates
  function handleAiEstimateUpdated(event) {
    const eventProjectId = event.detail.projectId;
    
    // Only refresh if this is for the current project
    if (eventProjectId && eventProjectId === projectId) {
      // Refresh the data
      fetchEstimateItems().then(() => {
        // If we have a reference to the EstimateDisplay component, call its refreshData method
        if (estimateDisplayComponent && typeof estimateDisplayComponent.refreshData === 'function') {
          estimateDisplayComponent.refreshData();
        }
      });
    }
  }
  
  onMount(() => {
    projectId = parseUrlParams();
    
    window.addEventListener('projectSelected', handleProjectSelected);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('newProject', handleNewProject);
    window.addEventListener('aiEstimateUpdated', handleAiEstimateUpdated);
    
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
      window.removeEventListener('aiEstimateUpdated', handleAiEstimateUpdated);
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
  {:else if projectId && estimateItems.length > 0 && $user}
    <div class="relative">
      <EstimateDisplay 
        bind:this={estimateDisplayComponent}
        result={formatEstimateItemsForDisplay()} 
        projectId={projectId}
        on:itemAdded={handleItemAdded}
        on:itemDeleted={handleItemDeleted}
      />
      
      <!-- AI Sidebar Toggle Button - Conditionally rendered -->
      {#if !isAiSidebarVisible}
      <div 
        class="fixed bottom-6 right-6 flex flex-col items-end space-y-2 z-[999]" 
        style="pointer-events: auto;"
      >
        <div class="hidden md:block bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-2 rounded-md shadow-md flex items-center mb-2">
          <Keyboard class="h-3 w-3 mr-1" />
          <span>Ctrl+K</span>
        </div>
        <button
          class="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-[100] cursor-pointer"
          on:click={openAiSidebar}
          aria-label="Open AI Estimator"
          data-testid="ai-sidebar-open-button"
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
      
      {#if projectId && $user}
        {#if !isAiSidebarVisible}
        <div class="fixed bottom-6 right-6 flex flex-col items-end space-y-2 z-[999]" style="pointer-events: auto;">
          <div class="hidden md:block bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-2 rounded-md shadow-md flex items-center mb-2">
            <Keyboard class="h-3 w-3 mr-1" />
            <span>Ctrl+K</span>
          </div>
          <button
            class="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-[100] cursor-pointer"
            on:click={openAiSidebar}
            aria-label="Open AI Estimator"
            data-testid="ai-sidebar-open-button"
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
