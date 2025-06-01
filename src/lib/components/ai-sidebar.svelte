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
    // Dispatch event to notify that the sidebar has been closed
    window.dispatchEvent(new CustomEvent('aiSidebarClosed'));
  }
  
  async function fetchLatestConversation() {
    if (!projectId || !$user) return;
    
    try {
      isLoading = true;
      error = null;
      
      const { data: businessUserData, error: businessUserError } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', $user.id)
        .single();
      
      if (businessUserError) throw businessUserError;
      
      const businessId = businessUserData?.business_id;
      
      if (!businessId) {
        throw new Error('User is not associated with any business');
      }
      
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('project_id', projectId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (conversationError) throw conversationError;
      
      if (conversationData && conversationData.length > 0) {
        latestConversation = conversationData[0];
      } else {
        latestConversation = null;
      }
    } catch (e) {
      console.error('Error fetching latest conversation:', e);
      error = e instanceof Error ? e.message : 'Failed to fetch conversation data';
    } finally {
      isLoading = false;
    }
  }
  
  $: if (open && projectId) {
    fetchLatestConversation();
  }
  
  // Close sidebar if user is not authenticated
  $: if (open && !$user) {
    close();
  }
  
</script>

<!-- Single responsive layout -->
{#if open}
<div 
  class="h-full flex-col border-l bg-background transition-all duration-300 ease-in-out
         md:w-[350px] md:flex-shrink-0 md:relative
         w-full fixed z-[60] right-0 top-0 bottom-0 md:z-auto
         flex
         md:translate-x-0
         {open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}"
  data-testid="ai-sidebar"
>
  <div class="p-3 sm:p-4 border-b flex items-center justify-between gap-2">
    <div class="flex items-center gap-2 min-w-0">
      <MessageSquare class="h-5 w-5 flex-shrink-0" />
      <h2 class="text-base md:text-lg font-semibold truncate">
        <span class="hidden md:inline">AI Estimating Agent</span>
        <span class="md:hidden">AI Agent</span>
      </h2>
    </div>
    <button 
      class="p-1.5 rounded-md hover:bg-slate-100 active:bg-slate-200 dark:hover:bg-slate-800 flex-shrink-0" 
      on:click={close}
      data-testid="ai-sidebar-close-button"
      aria-label="Close AI sidebar"
    >
      <X class="h-5 w-5" />
    </button>
  </div>
  
  <div class="flex-1 overflow-hidden">
    {#if isLoading}
      <div class="flex items-center justify-center h-full">
        <p class="text-sm text-muted-foreground">Loading conversation...</p>
      </div>
    {:else if error}
      <div class="flex items-center justify-center h-full p-4">
        <div class="p-3 rounded-lg bg-destructive text-destructive-foreground max-w-[80%]">
          <p class="text-sm">Error: {error}</p>
          <button 
            class="mt-2 text-xs underline"
            on:click={fetchLatestConversation}
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
{/if}

{#if open}
  <div 
    class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] md:hidden" 
    on:click={close}
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="button"
    tabindex="0"
    aria-label="Close AI sidebar"
    data-testid="ai-sidebar-backdrop"
  ></div>
{/if}

<svelte:window on:keydown={(e) => e.key === 'Escape' && open && close()} />