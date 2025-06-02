<script lang="ts">
  import { user } from '../../stores/authStore';
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { Globe } from 'lucide-svelte';
  import StreamingEstimateView from './StreamingEstimateView.svelte';
  import LoginDialog from '../auth/LoginDialog.svelte';

  export let projectId = null;
  export let projectData = null;

  let loading = false;
  let result = null;
  let error = null;
  let projectDescription = "";
  let inputElement: HTMLTextAreaElement;
  
  // Streaming state
  let showStreamingView = false;
  let streamingProjectDetails = null;
  
  // Login dialog state
  let showLoginDialog = false;
  
  // Web search state
  let webSearchEnabled = false;

  onMount(() => {
    if (projectData) {
      projectDescription = projectData.description || '';
    }
    // Focus the input when the component mounts
    if (inputElement) {
      inputElement.focus();
      autoResize();
    }
  });

  function autoResize() {
    if (inputElement) {
      inputElement.style.height = 'auto';
      inputElement.style.height = Math.max(inputElement.scrollHeight, 60) + 'px';
    }
  }

  function handleInput() {
    autoResize();
  }

  function handleKeydown(event: KeyboardEvent) {
    // Submit on Enter key (without modifiers)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    // Allow Shift+Enter for new lines
  }

  async function handleSubmit() {
    if (!projectDescription.trim()) {
      error = 'Please provide a project description';
      return;
    }

    loading = true;
    error = null;
    result = null;

    // Check if user is logged in (simplified check)
    const isLoggedIn = $user !== null;
    
    if (!isLoggedIn) {
      loading = false;
      showLoginDialog = true;
      return;
    }
    
    try {
      
      // Prepare project details for streaming
      streamingProjectDetails = {
        title: generateProjectTitle(projectDescription),
        description: projectDescription
      };

      // Show streaming view
      showStreamingView = true;
      loading = false;

    } catch (err) {
      error = err.message || 'Failed to generate estimate';
      console.error('Error submitting form:', err);
      loading = false;
    }
  }

  function generateProjectTitle(description: string): string {
    // Generate a simple title from the description
    const words = description.trim().split(' ').slice(0, 6);
    let title = words.join(' ');
    if (words.length === 6 && description.trim().split(' ').length > 6) {
      title += '...';
    }
    return title || 'Construction Project';
  }

  function handleStreamingComplete(projectId: string) {
    // Navigate to the saved project
    window.location.href = `#/estimator?id=${projectId}`;
    window.location.reload();
  }

  function handleStreamingCancel() {
    // Return to form
    showStreamingView = false;
    streamingProjectDetails = null;
    loading = false;
  }
</script>

{#if showStreamingView}
  <!-- Streaming View -->
  <StreamingEstimateView 
    projectDetails={streamingProjectDetails}
    additionalRequirements=""
    webSearchEnabled={webSearchEnabled}
    onComplete={handleStreamingComplete}
    onCancel={handleStreamingCancel}
  />
{:else}
  <!-- Original Form -->
  <div class="flex items-center justify-center p-6" style="min-height: calc(100vh - 4rem); align-items: center;">
    <div class="w-full max-w-2xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-16">
        <h1 class="text-4xl font-semibold text-gray-900 mb-4">Construction Estimator</h1>
        <p class="text-lg text-gray-600">Describe your project to get an instant estimate</p>
      </div>

      <!-- Main Input -->
      <div class="relative">
        <form on:submit|preventDefault={handleSubmit}>
          <div class="relative">
            <textarea
              bind:this={inputElement}
              bind:value={projectDescription}
              on:input={handleInput}
              on:keydown={handleKeydown}
              placeholder="Describe your construction project in detail... Include materials, scope, timeline, and any specific requirements."
              rows="1"
              class="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all focus:outline-none text-gray-900 placeholder-gray-500 resize-none overflow-hidden min-h-[60px]"
            ></textarea>
            
            <!-- Submit button for mobile, positioned absolutely -->
            <button
              type="submit"
              disabled={loading || !projectDescription.trim()}
              class="absolute right-2 bottom-2 p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors md:hidden"
              aria-label="Submit"
            >
              {#if loading}
                <svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {:else}
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              {/if}
            </button>
          </div>
        </form>

        {#if error}
          <div class="mt-3 text-sm text-red-600 text-center">
            {error}
          </div>
        {/if}
        
        <!-- Web Search Toggle -->
        <div class="flex justify-center mt-4">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium hover:bg-gray-100"
            on:click={() => webSearchEnabled = !webSearchEnabled}
            title={webSearchEnabled ? 'Disable internet use' : 'Enable internet use'}
            data-testid="web-search-toggle"
          >
            <Globe class="h-4 w-4 {webSearchEnabled ? 'text-accent-custom' : 'text-gray-400'}" />
            <span class="{webSearchEnabled ? 'text-accent-custom' : 'text-gray-600'}">{webSearchEnabled ? 'Internet use enabled' : 'Enable internet use'}</span>
          </button>
        </div>
      </div>

      <!-- Helper text -->
      <div class="mt-4 text-center text-sm text-gray-500">
        <span class="hidden md:inline">Press Enter to submit</span>
        <span class="md:hidden">Tap the arrow to submit</span>
      </div>
    </div>
  </div>
{/if}

<!-- Login Dialog -->
<LoginDialog 
  open={showLoginDialog} 
  onOpenChange={(value) => showLoginDialog = value} 
/>