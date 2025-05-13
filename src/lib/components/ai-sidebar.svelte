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
