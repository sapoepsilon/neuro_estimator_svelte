<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { user } from '../../stores/authStore';
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { API_AGENT_URL } from "$lib/components/ui/sidebar/constants";

  export let projectId = null;
  export let projectData = null;

  let loading = false;
  let result = null;
  let error = null;
  let projectDescription = "";
  let inputElement: HTMLInputElement;

  onMount(() => {
    if (projectData) {
      projectDescription = projectData.description || '';
    }
    // Focus the input when the component mounts
    if (inputElement) {
      inputElement.focus();
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  }

  async function handleSubmit() {
    if (!projectDescription.trim()) {
      error = 'Please provide a project description';
      return;
    }

    loading = true;
    error = null;
    result = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!$user || !session) {
        throw new Error('Authentication required. Please log in to generate an estimate.');
      }
      
      const response = await fetch(API_AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ prompt: projectDescription })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      result = await response.json();
      window.location.href = `#/estimator?id=${result.projectId}`;
      window.location.reload();
    } catch (err) {
      error = err.message || 'Failed to generate estimate';
      console.error('Error submitting form:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-6" style="align-items: center; transform: translateY(-10vh);">
  <div class="w-full max-w-2xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-16">
      <h1 class="text-4xl font-semibold text-gray-900 mb-4">Construction Estimator</h1>
      <p class="text-lg text-gray-600">Describe your project to get an instant estimate</p>
    </div>

    <!-- Main Input -->
    <div class="relative">
      <form on:submit|preventDefault={handleSubmit}>
        <div class="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <input
            bind:this={inputElement}
            type="text"
            bind:value={projectDescription}
            on:keydown={handleKeydown}
            placeholder="Describe your construction project..."
            class="flex-1 px-4 py-3 border-0 rounded-l-lg focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-500"
          />
          
          <Button
            type="submit"
            disabled={loading || !projectDescription.trim()}
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-r-lg border-0 transition-colors"
          >
            {#if loading}
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {:else}
              Create
            {/if}
          </Button>
        </div>
      </form>

      {#if error}
        <div class="mt-3 text-sm text-red-600 text-center">
          {error}
        </div>
      {/if}
    </div>

    <!-- Helper text -->
    <div class="mt-4 text-center text-sm text-gray-500">
      Press ⌘+Enter to submit quickly
    </div>
  </div>
</div>