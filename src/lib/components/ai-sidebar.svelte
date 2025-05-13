<script lang="ts">
  import { X, MessageSquare } from 'lucide-svelte';
  import { supabase } from "$lib/supabase";
  import { user } from "../../stores/authStore";
  import AgentChat from "$lib/components/ai-agent/agent-chat.svelte";
  
  export let open = false;
  export let projectId: string | null = null;
  export let projectName: string | null = null;
  
  let latestConversation: { id: string, created_at: string } | null = null;
  let isLoading = false;
  let error: string | null = null;
  
  function close() {
    open = false;
  }
  
  async function fetchLatestConversation() {
    if (!projectId || !$user) {
      console.log('Skipping fetch: missing projectId or user');
      isLoading = false; 
      return;
    }
    
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Loading timeout reached, resetting loading state');
        isLoading = false;
        error = 'Loading timed out. Please try again.';
      }
    }, 10000);
    
    try {
      console.log('Starting to fetch conversation for project:', projectId);
      isLoading = true;
      error = null;
      
      // First check if the user is associated with a business
      const { data: businessUserData, error: businessUserError } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', $user.id)
        .single();
      
      if (businessUserError) {
        console.error('Business user error:', businessUserError);
        throw businessUserError;
      }
      
      const businessId = businessUserData?.business_id;
      
      if (!businessId) {
        console.error('No business ID found for user');
        throw new Error('User is not associated with any business');
      }
      
      console.log('Found business ID:', businessId);
      
      // Then fetch the conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('project_id', projectId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (conversationError) {
        console.error('Conversation fetch error:', conversationError);
        throw conversationError;
      }
      
      console.log('Conversation data:', conversationData);
      
      if (conversationData && conversationData.length > 0) {
        latestConversation = conversationData[0];
        console.log('Latest conversation found:', latestConversation.id);
      } else {
        console.log('No conversation found for this project, creating a new one');
        
        // Create a new conversation for this project
        try {
          const { data: newConversation, error: newConversationError } = await supabase
            .from('conversations')
            .insert([{ 
              project_id: projectId,
              business_id: businessId,
              created_by: $user.id 
            }])
            .select();
          
          if (newConversationError) throw newConversationError;
          
          if (newConversation && newConversation.length > 0) {
            latestConversation = {
              id: newConversation[0].id,
              created_at: newConversation[0].created_at
            };
            console.log('Created new conversation:', latestConversation.id);
          } else {
            throw new Error('Failed to create conversation');
          }
        } catch (createError) {
          console.error('Error creating new conversation:', createError);
          latestConversation = null;
          throw new Error('Failed to create a new conversation');
        }
      }
    } catch (e) {
      console.error('Error fetching latest conversation:', e);
      error = e instanceof Error ? e.message : 'Failed to fetch conversation data';
    } finally {
      clearTimeout(loadingTimeout); // Clear the timeout
      isLoading = false;
      console.log('Fetch completed, loading state set to false');
    }
  }
  
  // Track previous state to prevent unnecessary fetches
  let previousProjectId: string | null = null;
  let previousOpenState = false;
  let fetchInProgress = false;
  
  // Function to safely trigger the fetch
  function triggerFetch() {
    if (fetchInProgress) {
      console.log('Fetch already in progress, skipping');
      return;
    }
    
    if (!open || !projectId) {
      console.log('Sidebar closed or no project ID, skipping fetch');
      return;
    }
    
    console.log('AI Sidebar: Triggering fetch for project', projectId);
    fetchInProgress = true;
    
    // Use setTimeout to ensure this runs after the current execution context
    setTimeout(() => {
      fetchLatestConversation().finally(() => {
        fetchInProgress = false;
      });
    }, 0);
  }
  
  $: if (open && projectId && (projectId !== previousProjectId || open !== previousOpenState)) {
    // Only fetch when projectId or open state actually changes
    console.log('AI Sidebar: State changed, preparing to fetch for project', projectId);
    previousProjectId = projectId;
    previousOpenState = open;
    triggerFetch();
  }
</script>

<div 
  class="h-full flex flex-col border-l bg-background transition-all duration-300 ease-in-out fixed z-40 right-0 top-0 bottom-0 w-[350px]" 
  class:translate-x-full={!open}
  class:translate-x-0={open}
>
  <div class="p-4 border-b flex items-center justify-between">
    <div class="flex items-center gap-2">
      <MessageSquare class="h-5 w-5" />
      <h2 class="text-lg font-semibold">AI Estimating Agent</h2>
    </div>
    <div class="flex items-center gap-2">
      <div class="text-sm text-muted-foreground">{projectName || 'New Project'}</div>
      <button 
        class="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" 
        on:click={close}
        aria-label="Close AI sidebar"
      >
        <X class="h-5 w-5" />
      </button>
    </div>
  </div>
  
  <div class="flex-1 overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center space-y-2">
          <div class="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <p class="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center h-full p-4">
        <div class="p-3 rounded-lg bg-destructive text-destructive-foreground max-w-[80%]">
          <p class="text-sm">Error: {error}</p>
          <button 
            class="mt-2 text-xs underline"
            on:click={() => {
              // Reset error state and trigger a new fetch
              error = null;
              triggerFetch();
            }}
          >
            Try again
          </button>
        </div>
      </div>
    {:else}
      <AgentChat 
        projectId={projectId}
        projectName={projectName}
        conversationId={latestConversation?.id}
        on:aiResponseSuccess={(event) => {
          // Dispatch a global event to notify that the AI agent has responded successfully
          window.dispatchEvent(new CustomEvent('aiEstimateUpdated', {
            detail: {
              projectId: event.detail.projectId,
              estimateId: event.detail.estimateId,
              responseData: event.detail.responseData
            }
          }));
        }}
      />
    {/if}
  </div>
</div>

{#if open}
  <div 
    class="fixed inset-0 bg-black/20 z-30 md:hidden" 
    on:click={close}
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="button"
    tabindex="0"
    aria-label="Close AI sidebar"
  ></div>
{/if}
