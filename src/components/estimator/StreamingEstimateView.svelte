<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { streamingService } from '$lib/services/streamingService';
  import { supabase } from '$lib/supabase';

  export let projectDetails = null;
  export let additionalRequirements = '';
  export let webSearchEnabled = false;
  export let onComplete = null; // Callback when streaming completes
  export let onCancel = null; // Callback when user cancels

  // Streaming state
  let streamingState = 'connecting'; // connecting, streaming, processing, complete, error, cancelled
  let statusMessage = 'Initializing AI estimation...';
  let chunkCount = 0;
  let error = null;
  let projectId = null;

  // Estimate data (builds up during streaming)
  let estimate = {
    title: projectDetails?.title || 'AI Generated Estimate',
    description: projectDetails?.description || '',
    currency: 'USD',
    projectColumns: [],
    lineItems: [],
    totalAmount: 0
  };

  // Buffer for accumulating partial chunks
  let chunkBuffer = '';

  onMount(() => {
    startStreaming();
  });

  onDestroy(() => {
    streamingService.cleanup();
  });

  function parseLineItemsFromBuffer(buffer: string): any[] {
    const lineItems = [];
    
    // Look for complete action tags
    const actionRegex = /<action>([^<]+)<\/action>/g;
    let match;
    
    while ((match = actionRegex.exec(buffer)) !== null) {
      const actionContent = match[1];
      
      // Parse the action content into a line item
      const lineItem = {};
      
      // Remove the leading + if present
      const cleanContent = actionContent.replace(/^\s*\+\s*/, '').trim();
      
      // Parse key=value pairs
      const pairs = [];
      let currentPair = '';
      let inQuotes = false;
      let quoteChar = '';
      
      for (let i = 0; i < cleanContent.length; i++) {
        const char = cleanContent[i];
        
        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true;
          quoteChar = char;
          currentPair += char;
        } else if (char === quoteChar && inQuotes) {
          inQuotes = false;
          quoteChar = '';
          currentPair += char;
        } else if (char === ',' && !inQuotes) {
          if (currentPair.trim()) {
            pairs.push(currentPair.trim());
          }
          currentPair = '';
        } else {
          currentPair += char;
        }
      }
      
      // Don't forget the last pair
      if (currentPair.trim()) {
        pairs.push(currentPair.trim());
      }
      
      // Parse each key=value pair into the line item
      for (const pair of pairs) {
        const equalIndex = pair.indexOf('=');
        if (equalIndex > 0) {
          const field = pair.substring(0, equalIndex).trim();
          const value = pair.substring(equalIndex + 1).trim().replace(/^['"]|['"]$/g, '');
          
          // Normalize field names
          const normalizedField = field.toLowerCase().replace(/\s+/g, '_');
          
          // Convert numeric values
          if (['quantity', 'unit_price', 'amount'].includes(normalizedField)) {
            lineItem[normalizedField] = parseFloat(value) || 0;
          } else {
            lineItem[normalizedField] = value;
          }
        }
      }
      
      // Only add if we have meaningful data
      if (lineItem.description || lineItem.title) {
        lineItems.push(lineItem);
      }
    }
    
    return lineItems;
  }

  async function startStreaming() {
    console.log('🎆 StreamingEstimateView: Starting streaming...');
    try {
      // Use real streaming service
      const service = streamingService;
      
      // Set up event listeners for all backend events
      service.on('stream_start', handleStreamStart);
      service.on('ai_start', handleAiStart);
      service.on('progress', handleProgress);
      service.on('chunk', handleChunk);
      service.on('partial', handlePartial);
      service.on('complete', handleComplete);
      service.on('ai_complete', handleAiComplete);
      service.on('project_created', handleProjectCreated);
      service.on('stream_complete', handleStreamComplete);
      service.on('error', handleError);
      service.on('stream_cancelled', handleCancelled);
      
      // Add detailed logging for debugging
      service.on('event', (event) => {
        console.log(`📡 Stream event [${event.type}]:`, event);
        
        // Log specific event data for debugging
        if (event.type === 'chunk' && event.content) {
          console.log('📄 Chunk content preview:', event.content.substring(0, 200));
        }
        if (event.type === 'complete' && event.data) {
          console.log('✅ Complete data structure:', Object.keys(event.data));
        }
      });

      // Start streaming
      streamingState = 'connecting';
      statusMessage = 'Connecting to AI service...';

      const requestData = {
        projectDetails,
        additionalRequirements,
        should_use_web: webSearchEnabled
      };
      
      console.log('📦 Request data prepared:', requestData);

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      console.log('🔐 Session check:', session ? 'Found' : 'Missing');
      
      if (!accessToken) {
        console.error('🙅 No access token found');
        throw new Error('Authentication required');
      }
      
      console.log('🚀 Calling service.startStreaming...');
      projectId = await service.startStreaming(requestData, accessToken);
      console.log('✅ Streaming completed, projectId:', projectId);

    } catch (error) {
      console.error('💥 StreamingEstimateView error:', error);
      handleError({ error: error.message });
    }
  }

  function handleStreamStart({ message }) {
    streamingState = 'streaming';
    statusMessage = message || 'AI estimation started...';
    chunkCount = 0;
  }

  function handleAiStart({ message }) {
    statusMessage = message || 'AI is analyzing your project...';
  }

  function handleProgress({ message, chunkCount: count, stage, accumulatedLength }) {
    // Handle different types of progress messages
    if (count) {
      chunkCount = count;
    }
    
    if (stage === 'request') {
      statusMessage = 'Sending request to AI model...';
    } else if (stage === 'streaming') {
      statusMessage = `AI generating estimate...`;
    } else if (message) {
      const match = message.match(/(\d+)/);
      if (match) {
        chunkCount = parseInt(match[1]);
        statusMessage = `AI generating estimate...`;
      } else {
        statusMessage = message;
      }
    }
  }

  function handleChunk({ content, chunkNumber, totalLength }) {
    // Handle raw chunk data and parse action items
    if (content && typeof content === 'string') {
      console.log(`📦 Chunk ${chunkNumber}:`, content.substring(0, 100) + (content.length > 100 ? '...' : ''));
      
      // Add to buffer for parsing complete actions
      chunkBuffer += content;
      
      // Parse only new complete line items from the current chunk
      const newLineItems = parseLineItemsFromBuffer(content);
      
      if (newLineItems.length > 0) {
        console.log('🎯 New line items in this chunk:', newLineItems);
        
        // Add new line items directly to estimate
        newLineItems.forEach((lineItem) => {
          // Create unique ID for each item
          lineItem.id = `chunk-${chunkNumber}-${Date.now()}-${Math.random()}`;
          lineItem.row_number = estimate.lineItems.length + 1;
          
          // Add to estimate immediately
          estimate.lineItems = [...estimate.lineItems, lineItem];
          console.log('➕ Added:', lineItem.description || lineItem.title, 'Total items:', estimate.lineItems.length);
        });
        
        // Force reactivity
        estimate = estimate;
      }
      
      // Update progress based on chunk info
      if (chunkNumber) {
        chunkCount = chunkNumber;
        statusMessage = `AI streaming estimate... chunk ${chunkNumber} received`;
      }
    }
  }

  function handlePartial({ data }) {
    if (data) {
      // Update estimate with partial data
      if (data.project_title) {
        estimate.title = data.project_title;
      }
      if (data.description) {
        estimate.description = data.description;
      }
      if (data.currency) {
        estimate.currency = data.currency;
      }
      if (data.lineItems && Array.isArray(data.lineItems)) {
        // Replace line items with the partial data
        estimate.lineItems = data.lineItems;
      }
      
      // Force reactivity
      estimate = { ...estimate };
    }
  }

  function handleComplete({ data }) {
    console.log('🎯 handleComplete received data:', data);
    streamingState = 'processing';
    statusMessage = 'Finalizing estimate...';
    
    if (data) {
      // Parse instructions into line items if needed
      let finalLineItems = [];
      
      if (data.instructions && Array.isArray(data.instructions)) {
        console.log('📋 Parsing instructions into line items...');
        
        // Parse each instruction as a complete action
        data.instructions.forEach((instruction, index) => {
          // Wrap instruction in action tags if not already wrapped
          const wrappedInstruction = instruction.includes('<action>') 
            ? instruction 
            : `<action>${instruction}</action>`;
          
          // Parse the instruction into line items
          const parsedItems = parseLineItemsFromBuffer(wrappedInstruction);
          finalLineItems.push(...parsedItems);
        });
        
        console.log('📊 Parsed line items:', finalLineItems);
      } else if (data.lineItems && Array.isArray(data.lineItems)) {
        finalLineItems = data.lineItems;
      }
      
      // If we have line items from streaming, merge them with final data
      if (estimate.lineItems.length > 0 && finalLineItems.length > 0) {
        // Keep streaming items if no final items, otherwise use final items
        estimate.lineItems = finalLineItems;
      } else if (finalLineItems.length > 0) {
        estimate.lineItems = finalLineItems;
      }
      
      // Update row numbers
      estimate.lineItems.forEach((item, index) => {
        item.row_number = index + 1;
        if (!item.id) {
          item.id = `item-${index + 1}`;
        }
      });
      
      estimate = {
        ...estimate,
        title: data.projectTitle || data.project_title || estimate.title,
        currency: data.currency || estimate.currency,
        totalAmount: calculateTotal(estimate.lineItems)
      };
      
      console.log('📈 Updated estimate:', estimate);
    }
  }

  function handleProjectCreated({ projectId: id, data }) {
    projectId = id;
    statusMessage = 'Estimate saved successfully!';
    
    if (data) {
      estimate = { ...estimate, ...data };
    }
  }

  function handleStreamComplete({ projectId: id }) {
    streamingState = 'complete';
    statusMessage = 'Estimate generation complete!';
    
    if (id) {
      projectId = id;
    }
    
    // Navigate to saved project after a brief delay
    setTimeout(() => {
      if (onComplete && projectId) {
        onComplete(projectId);
      }
    }, 2000);
  }

  function handleError({ error: errorMsg }) {
    streamingState = 'error';
    error = errorMsg || 'An unexpected error occurred';
    statusMessage = 'Error generating estimate';
  }

  function handleCancelled() {
    streamingState = 'cancelled';
    statusMessage = 'Estimate generation cancelled';
  }
  
  function handleAiComplete({ message }) {
    streamingState = 'processing';
    statusMessage = message || 'AI generation complete, processing results...';
  }


  function calculateTotal(items) {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }

  function cancelStreaming() {
    streamingService.cancel();
    if (onCancel) {
      onCancel();
    }
  }

  // Update total when line items change
  $: if (estimate.lineItems) {
    estimate.totalAmount = calculateTotal(estimate.lineItems);
  }
</script>

<style>
  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .fade-in-slide {
    animation: fadeInSlide 0.3s ease-out;
  }

  .pulse-animation {
    animation: pulse 2s infinite;
  }

  /* Table animations */
  tbody tr {
    transition: background-color 0.2s ease;
  }
  
  /* Responsive table */
  @media (max-width: 768px) {
    table {
      font-size: 0.875rem;
    }
    
    th, td {
      padding: 0.5rem !important;
    }
  }
</style>

<div class="min-h-screen flex flex-col p-6">
  <!-- Header with project info -->
  <div class="bg-white rounded-md shadow mb-4">
    <div class="p-4 bg-slate-50 rounded-t-md border-b">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">{estimate.title}</h1>
          <p class="text-sm text-gray-600 mt-1">{estimate.description}</p>
          <p class="text-sm text-gray-500 mt-1">Currency: {estimate.currency}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold text-gray-900">{estimate.totalAmount} {estimate.currency}</p>
          {#if streamingState !== 'complete' && streamingState !== 'error' && streamingState !== 'cancelled'}
            <p class="text-sm text-gray-500">Estimate updating...</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Status and Controls -->
    <div class="p-4 bg-blue-50 border-b">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          {#if streamingState === 'connecting' || streamingState === 'streaming'}
            <div class="pulse-animation">
              <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
          {:else if streamingState === 'complete'}
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          {:else if streamingState === 'error'}
            <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          {/if}
          
          <div>
            <p class="font-medium text-gray-900">{statusMessage}</p>
          </div>
        </div>

        {#if streamingState === 'connecting' || streamingState === 'streaming' || streamingState === 'processing'}
          <button 
            on:click={cancelStreaming}
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            Cancel
          </button>
        {/if}

        {#if error}
          <div class="text-red-600 text-sm">{error}</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Estimate Grid -->
  {#if estimate.lineItems.length > 0}
    <div class="bg-white rounded-md shadow flex-1 overflow-auto">
      <div class="min-w-full">
        <table class="w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Type</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Type</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each estimate.lineItems as item, index (item.id || index)}
              <tr class="fade-in-slide hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">{item.description || item.title || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">{item.quantity || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">{item.unit_type || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.unit_price || 0}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${item.amount || 0}</td>
                <td class="px-4 py-3 text-sm text-gray-900">{item.cost_type || '-'}</td>
              </tr>
            {/each}
            <!-- Total Row -->
            <tr class="bg-gray-100 font-bold">
              <td class="px-4 py-3 text-sm text-gray-900">Total</td>
              <td class="px-4 py-3 text-sm text-gray-900"></td>
              <td class="px-4 py-3 text-sm text-gray-900"></td>
              <td class="px-4 py-3 text-sm text-gray-900"></td>
              <td class="px-4 py-3 text-sm text-gray-900">${estimate.totalAmount}</td>
              <td class="px-4 py-3 text-sm text-gray-900"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <div class="bg-white rounded-md shadow flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="pulse-animation mb-4">
          <svg class="w-12 h-12 text-blue-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-lg font-medium text-gray-900">Generating your estimate...</p>
        <p class="text-gray-600 mt-2">AI is analyzing your project and creating line items</p>
      </div>
    </div>
  {/if}
</div>