<script lang="ts">
  import { onMount, getContext, createEventDispatcher } from 'svelte';
  import { Send, Loader2, X, ChevronDown } from 'lucide-svelte';
  import { supabase } from "$lib/supabase";
  import { user } from "../../../stores/authStore";
  import { gridData, currentProjectId } from "../../../stores/gridStore";
  import { API_AGENT_PROMPT_URL } from '../ui/sidebar/constants';
  import EstimateResponseCard from './estimate-response-card.svelte';
  
  export let projectId: string | null = null;
  export let projectName: string | null = null;
  export let conversationId: string | null = null;
  
  type MessageBase = {
    id?: string;
    role: 'user' | 'system' | 'assistant';
    content: string;
    created_at?: string;
  }
  
  type LoadingMessage = MessageBase & {
    loading: boolean;
  }
  
  type ErrorMessage = MessageBase & {
    error: boolean;
  }
  
  type Message = MessageBase | LoadingMessage | ErrorMessage;
  

  
  // Chat state
  let messages: Message[] = [];
  let internalConversationId: string | null = conversationId;
  let isLoading = true;
  let isApiLoading = false; // Track API request loading state
  let loadError: string | null = null;
  
  let newMessage = '';
  let chatContainer: HTMLElement;
  
  // XML response handling
  let expandedMessages: Set<string> = new Set();
  
  // Range selection state
  let rangeInput = '';
  let showRangeSuggestions = false;
  let rangeStart = 0;
  let rangeEnd = 0;
  let gridItems: Array<{id: string, name: string, row: number}> = [];
  let selectedRange: { start: number, end: number } | null = null;
  let rangeSelectionComplete = false; // Flag to track if a range selection was completed
  
  // Subscribe to grid data changes
  $: if ($gridData && $gridData.gridSource) {
    console.log('Grid data updated:', $gridData.gridSource.length, 'items');
    gridItems = $gridData.gridSource
      .filter((item: any) => item?.description) // Only include items with a description
      .map((item: any, index: number) => ({
        id: item.id || `row-${index}`,
        name: item.description || `Item ${index + 1}`,
        row: index + 1 // 1-based index for display
      }));
    console.log('Processed grid items:', gridItems.length);
  }
  
  // Handle @ key press for range selection
  function handleAtKey() {
    // Reset the range selection complete flag when @ is pressed
    rangeSelectionComplete = false;
    
    const cursorPos = (document.activeElement as HTMLInputElement).selectionStart || 0;
    const textBeforeCursor = newMessage.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    if (lastAt !== -1) {
      rangeStart = lastAt;
      showRangeSuggestions = true;
      console.log('@ key pressed, showing suggestions. Grid items:', gridItems.length);
      
      // Force the input to include the @ symbol if it was just typed
      if (lastAt === cursorPos - 1) {
        // Already added by normal typing
        rangeInput = '';
      } else {
        // Extract any text after @ to use as filter
        rangeInput = textBeforeCursor.substring(lastAt + 1, cursorPos);
      }
    }
  }
  
  // Handle range selection
  function selectRange(start: number, end: number) {
    // Create the range text
    const rangeText = `@${start}-${end}`;
    
    // Find the position of the @ symbol we're replacing
    const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
    const textBeforeCursor = newMessage.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    if (lastAt !== -1) {
      // Replace the entire @... text with our formatted range
      const beforeAt = newMessage.substring(0, lastAt);
      const afterRange = newMessage.substring(lastAt).replace(/^@[^\s]*/, '');
      newMessage = `${beforeAt}${rangeText}${afterRange}`;
    } else {
      // No @ found, just append to the end
      newMessage += rangeText;
    }
    
    // Hide suggestions
    showRangeSuggestions = false;
    
    // Focus back on the input
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 0);
  }

  // Parse range from @ notation (e.g., @5-10)
  function parseRange(text: string): { start: number, end: number } | null {
    const rangeMatch = text.match(/(\d+)(?:-(\d+))?/);
    
    if (!rangeMatch) return null;
    
    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;
    
    if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0 || start > end) {
      return null;
    }
    
    return { start, end };
  }
  
  // Apply the selected range
  function applyRange() {
    const range = parseRange(rangeInput);
    if (range) {
      selectRange(range.start, range.end);
    }
  }

  // Clear the selected range
  function clearRange() {
    selectedRange = null;
  }

  // Handle @ key press to show range selector
  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === '@') {
      showRangeSuggestions = true;
      event.preventDefault();
      // Add @ to the input
      newMessage = newMessage + '@';
      // Focus the range input
      setTimeout(() => {
        const rangeInputEl = document.getElementById('range-input');
        if (rangeInputEl) rangeInputEl.focus();
      }, 0);
    }
  }

  const dispatch = createEventDispatcher();

  // Function to load conversation history for the current project
  async function loadConversationHistory() {
    if ((!projectId && !internalConversationId) || !$user) {
      isLoading = false;
      return;
    }
    
    try {
      isLoading = true;
      loadError = null;
      
      // Use the provided conversationId if available, otherwise find the latest one
      if (!internalConversationId && projectId) {
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .select('id')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (conversationError) {
          throw conversationError;
        }
        
        if (conversationData && conversationData.length > 0) {
          // Existing conversation found
          internalConversationId = conversationData[0].id;
        }
      }
        
      // Load messages if we have a conversation ID
      if (internalConversationId) {
        // Load messages for this conversation
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', internalConversationId)
          .order('created_at', { ascending: true });
        
        if (messagesError) {
          throw messagesError;
        }
        
        if (messagesData && messagesData.length > 0) {
          messages = messagesData.map(msg => {
            let processedContent = msg.content;
            
            if (typeof msg.content === 'string' && (msg.content.startsWith('{') || msg.content.startsWith('['))) {
              try {
                const contentObj = JSON.parse(msg.content);
                if (contentObj.raw_response && contentObj.raw_response.text) {
                  processedContent = contentObj.raw_response.text;
                }
              } catch (e) {
                console.error('Error parsing message content:', e);
              }
            }
            
            return {
              id: msg.id,
              role: msg.role,
              content: processedContent,
              created_at: msg.created_at
            };
          });
        } else {
          // No messages found for this conversation, but we have a conversation ID
          // Add a welcome message to get started
          console.log('No messages found for conversation ID:', internalConversationId);
          messages = [
            {
              role: 'assistant' as const,
              content: projectName 
                ? `Welcome to the Estimating Agent AI Agent for project "${projectName}". How can I help you with your estimation?`
                : 'Welcome to the Estimating Agent AI Agent. How can I help you with your estimation?'
            }
          ];
        }
      } else {
        messages = [
          {
            role: 'assistant' as const,
            content: projectName 
              ? `Welcome to the Estimating Agent AI Agent for project "${projectName}". How can I help you with your estimation?`
              : 'Welcome to the Estimating Agent AI Agent. How can I help you with your estimation?'
          }
        ];
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      loadError = 'Failed to load conversation history. Please try again.';
      messages = [
        {
          role: 'system',
          content: 'Failed to load conversation history. Please try again.',
          error: true
        } as ErrorMessage
      ];
    } finally {
      isLoading = false;
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  }
  
  // Function to send message to AI agent
  async function sendMessage() {
    if (!newMessage.trim() || !$user) return;
    
    // Hide range suggestions if visible
    showRangeSuggestions = false;
    
    // Check for range references in the message
    const rangeReferences: Array<{range: {start: number, end: number}, text: string}> = [];
    const messageWithRanges = newMessage.replace(/@(\d+)(?:-(\d+))?/g, (match, start, end) => {
      const range = {
        start: parseInt(start, 10),
        end: end ? parseInt(end, 10) : parseInt(start, 10)
      };
      const rangeId = `range_${range.start}_${range.end}`;
      rangeReferences.push({ range, text: `[Rows ${range.start}-${range.end}]` });
      return `[${rangeId}]`;
    });
    
    // Add user message to chat with formatted ranges
    let displayMessage = newMessage;
    rangeReferences.forEach(ref => {
      displayMessage = displayMessage.replace(
        `@${ref.range.start}-${ref.range.end}`, 
        `<span class="bg-blue-100 text-blue-800 px-1 rounded">@${ref.range.start}-${ref.range.end}</span>`
      );
    });
    
    const userMessage: MessageBase = {
      role: 'user' as const,
      content: displayMessage
    };
    
    messages = [...messages, userMessage];
    
    // Clear input
    const messageContent = newMessage;
    newMessage = '';
    
    // Scroll to bottom
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
    
    // Add loading message
    messages = [...messages, {
      role: 'assistant',
      content: '...',
      loading: true
    } as LoadingMessage];
    
    try {
      // Create a conversation if we don't have one yet
      if (!internalConversationId && projectId) {
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert([
            { 
              project_id: projectId,
              created_by: $user.id 
            }
          ])
          .select();
        
        if (conversationError) {
          throw conversationError;
        }
        
        if (newConversation && newConversation.length > 0) {
          internalConversationId = newConversation[0].id;
        } else {
          throw new Error('Failed to create conversation');
        }
      }
      
      if (internalConversationId) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert([
            {
              conversation_id: internalConversationId,
              content: messageContent,
              role: 'user',
              user_id: $user.id
            }
          ]);
        
        if (messageError) {
          throw messageError;
        }
      }
      
      messages = messages.filter(m => !('loading' in m));
      
      const estimateId = projectId;
      
      let response;
      let data;
      
      let accessToken = '';
      
      if ($user) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token || '';
      } else {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token || '';
      }
      
      isApiLoading = true; // Set API loading state to true
      try {
        response = await fetch(API_AGENT_PROMPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            estimateId: estimateId,
            projectId: projectId,
            prompt: messageWithRanges,
            userId: $user?.id,
            conversationId: internalConversationId,
            ranges: rangeReferences.length > 0 ? rangeReferences.map(ref => ref.range) : undefined
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          isApiLoading = false; // Reset API loading state on error response
          throw new Error(`API responded with status: ${response.status}. Details: ${errorText}`);
        }
        
        data = await response.json();
      } catch (apiError) {
        console.error('API call error details:', apiError);
        isApiLoading = false; // Reset API loading state on API error
        messages = [...messages, {
          role: 'system',
          content: `Error connecting to AI agent: ${apiError.message || 'Unknown error'}`,
          error: true
        } as ErrorMessage];
        return;
      }
      
      isApiLoading = false; // Reset API loading state
      
      // Create the assistant response object
      const assistantResponse: MessageBase = {
        role: 'assistant' as const,
        content: data.response || 'Completed'
      };
      
      // Save the message to the database to get an ID
      if (internalConversationId) {
        try {
          const { data: savedMessage, error: saveError } = await supabase
            .from('messages')
            .insert({
              conversation_id: internalConversationId,
              role: assistantResponse.role,
              content: assistantResponse.content,
              user_id: $user?.id
            })
            .select()
            .single();
          
          if (saveError) {
            console.error('Error saving assistant message:', saveError);
            // Still add the message to the UI even if saving fails
            messages = [...messages, assistantResponse];
          } else if (savedMessage) {
            // Add the saved message with ID to the messages array
            messages = [...messages, savedMessage as MessageBase];
          }
        } catch (error) {
          console.error('Error saving assistant message:', error);
          messages = [...messages, assistantResponse];
        }
      } else {
        // No conversation ID, just add to UI
        messages = [...messages, assistantResponse];
      }
      
      // Dispatch an event to notify that the AI agent has responded successfully
      // This will allow other components to refresh their data
      dispatch('aiResponseSuccess', {
        projectId: projectId,
        estimateId: estimateId,
        responseData: data
      });
      
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error sending message to AI agent:', error);
      
      isApiLoading = false; // Reset API loading state on error
      messages = messages.filter(m => !('loading' in m));
      messages = [...messages, {
        role: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        error: true
      } as ErrorMessage];
    }
  }
  
  // Check if a message contains an XML estimate
  function containsXmlEstimate(content: string): boolean {
    return content.includes('<estimate>') && content.includes('</estimate>');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    // Handle @ key for range selection
    if (event.key === '@') {
      handleAtKey();
      return;
    }
    
    // Handle Enter key
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      
      if (showRangeSuggestions) {
        // If we have a range selection dropdown open
        showRangeSuggestions = false;
        
        // Get the text after @ to check for range format
        const cursorPos = (event.target as HTMLInputElement)?.selectionStart || 0;
        const textBeforeCursor = newMessage.substring(0, cursorPos);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        
        if (lastAt !== -1) {
          const textAfterAt = textBeforeCursor.substring(lastAt + 1);
          const match = textAfterAt.match(/^(\d+)(?:-(\d+))?/);
          
          if (match) {
            const start = parseInt(match[1], 10);
            const end = match[2] ? parseInt(match[2], 10) : start;
            
            if (!isNaN(start) && !isNaN(end)) {
              // Replace the current @text with the properly formatted range
              const beforeAt = newMessage.substring(0, lastAt);
              const afterRange = newMessage.substring(lastAt + textAfterAt.length + 1);
              const rangeText = `@${start}-${end}`;
              newMessage = `${beforeAt}${rangeText}${afterRange}`;
              
              // Mark range selection as complete
              rangeSelectionComplete = true;
              return;
            }
          }
        }
      } else {
        // No range selection active, send the message
        sendMessage();
      }
    } 
    // Handle Escape key
    else if (event.key === 'Escape' && showRangeSuggestions) {
      showRangeSuggestions = false;
      rangeInput = '';
    }
  }
  
  onMount(() => {
    loadConversationHistory();
  });
  
  $: if (conversationId !== internalConversationId) {
    internalConversationId = conversationId;
    loadConversationHistory();
  }
</script>

<div class="h-full flex flex-col">
  <div 
    class="flex-1 overflow-auto p-4 space-y-4 relative"
    bind:this={chatContainer}
  >
    {#if isLoading}
      <div class="absolute inset-0 flex items-center justify-center bg-background/80">
        <div class="flex flex-col items-center space-y-2">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    {:else if loadError}
      <div class="flex justify-center">
        <div class="max-w-[80%] p-3 rounded-lg bg-destructive text-destructive-foreground">
          <p class="whitespace-pre-wrap break-words">{loadError}</p>
        </div>
      </div>
    {:else if messages.length === 0}
      <div class="flex justify-center">
        <div class="max-w-[80%] p-3 rounded-lg bg-muted">
          <p class="whitespace-pre-wrap break-words">No messages yet. Start a conversation!</p>
        </div>
      </div>
    {:else}
      {#each messages as message}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div 
            class="max-w-[80%] p-3 rounded-lg {message.role === 'user' 
              ? 'bg-primary text-primary-foreground' 
              : 'error' in message && message.error 
                ? 'bg-destructive text-destructive-foreground' 
                : 'bg-muted'}"
          >
            {#if 'loading' in message && message.loading}
              <div class="flex space-x-1">
                <div class="w-2 h-2 rounded-full bg-current animate-bounce"></div>
                <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.4s"></div>
              </div>
            {:else}
              {#if message.role === 'assistant' && containsXmlEstimate(message.content)}
                <EstimateResponseCard 
                  content={message.content} 
                  messageId={message.id} 
                  bind:expandedMessages={expandedMessages} 
                />
              {:else}
                <p class="whitespace-pre-wrap break-words">{message.content}</p>
              {/if}
              {#if message.created_at}
                <div class="text-xs opacity-50 mt-1">{new Date(message.created_at).toLocaleTimeString()}</div>
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
  
  <!-- Message Input -->
  <div class="p-4 border-t">
    {#if isApiLoading}
      <div class="flex justify-center mb-2">
        <div class="flex items-center space-x-2 text-primary">
          <Loader2 class="h-5 w-5 animate-spin" />
          <span class="text-sm">Processing your request...</span>
        </div>
      </div>
    {/if}
    <div class="relative">
      <input
        type="text"
        class="w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Type your message..."
        bind:value={newMessage}
        on:keydown={handleKeydown}
          on:input={(e) => {
          // If a range selection was completed, don't show suggestions until a new @ is typed
          if (rangeSelectionComplete) {
            // Check if the current character at cursor position is @
            const input = e.target as HTMLInputElement;
            const cursorPos = input.selectionStart || 0;
            
            // If the user just typed @, allow new suggestions
            if (cursorPos > 0 && newMessage.charAt(cursorPos - 1) === '@') {
              rangeSelectionComplete = false;
            } else {
              return;
            }
          }
          
          // Check if @ was typed
          if (newMessage.includes('@') && !showRangeSuggestions) {
            handleAtKey();
            return;
          }
          
          // Handle input while range suggestions are shown
          if (showRangeSuggestions) {
            const cursorPos = (e.target as HTMLInputElement).selectionStart || 0;
            const textBeforeCursor = newMessage.substring(0, cursorPos);
            const lastAt = textBeforeCursor.lastIndexOf('@');
            
            if (lastAt === -1) {
              // No @ found, hide suggestions
              showRangeSuggestions = false;
              return;
            }
            
            // Extract text after @ to use as filter
            const textAfterAt = textBeforeCursor.substring(lastAt + 1);
            rangeInput = textAfterAt;
            
            // Check if it's a valid range format
            const match = textAfterAt.match(/^(\d+)(?:-(\d*))?/);
            if (match) {
              rangeStart = parseInt(match[1], 10);
              rangeEnd = match[2] ? parseInt(match[2], 10) : rangeStart;
            }
          }
        }}
        on:blur={() => setTimeout(() => showRangeSuggestions = false, 200)}
        disabled={isApiLoading}
      />
      
      {#if showRangeSuggestions && gridItems.length > 0}
        <div class="absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          <div class="p-2 border-b bg-gray-50">
            <div class="text-xs font-medium text-gray-500">Select rows to reference</div>
          </div>
          {#each gridItems as item, i}
            {#if rangeInput === '' || String(item.row).includes(rangeInput) || 
                (rangeInput.includes('-') && item.row >= rangeStart && item.row <= rangeEnd)}
              <div 
               role="button"
               tabindex="0"
               class="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
               on:mousedown|preventDefault={() => {
                 // Find the @ symbol in the message
                 const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
                 const textBeforeCursor = newMessage.substring(0, cursorPos);
                 const lastAt = textBeforeCursor.lastIndexOf('@');
                 
                 if (lastAt !== -1) {
                   // Replace the entire @... text with our formatted range
                   const beforeAt = newMessage.substring(0, lastAt);
                   const afterAt = newMessage.substring(lastAt).replace(/^@[^\s]*/, '');
                   const rangeText = `@${item.row}`;
                   newMessage = `${beforeAt}${rangeText}${afterAt}`;
                   showRangeSuggestions = false;
                   
                   // Mark range selection as complete
                   rangeSelectionComplete = true;
                 }
               }}
               on:keydown={(e) => e.key === 'Enter' && selectRange(item.row, item.row)}
              >
                <div class="truncate">
                  <span class="font-mono text-xs text-gray-500 mr-2">#{item.row}</span>
                  <span>{item.name}</span>
                </div>
                <ChevronDown class="h-4 w-4 text-gray-400 transform rotate-90" />
              </div>
            {/if}
          {/each}
          {#if rangeInput.includes('-')}
            <div 
              role="button"
              tabindex="0"
              class="p-2 bg-blue-50 hover:bg-blue-100 cursor-pointer flex items-center justify-between border-t"
              on:mousedown|preventDefault={() => {
                // Find the @ symbol in the message
                const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
                const textBeforeCursor = newMessage.substring(0, cursorPos);
                const lastAt = textBeforeCursor.lastIndexOf('@');
                
                if (lastAt !== -1) {
                  // Get the range values
                  const [start, end] = rangeInput.split('-').map(Number);
                  if (!isNaN(start) && !isNaN(end || start)) {
                    // Replace the entire @... text with our formatted range
                    const beforeAt = newMessage.substring(0, lastAt);
                    const afterAt = newMessage.substring(lastAt).replace(/^@[^\s]*/, '');
                    const rangeText = `@${start}-${end || start}`;
                    newMessage = `${beforeAt}${rangeText}${afterAt}`;
                    showRangeSuggestions = false;
                    
                    // Mark range selection as complete
                    rangeSelectionComplete = true;
                  }
                }
              }}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  // Find the @ symbol in the message
                  const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
                  const textBeforeCursor = newMessage.substring(0, cursorPos);
                  const lastAt = textBeforeCursor.lastIndexOf('@');
                  
                  if (lastAt !== -1) {
                    // Get the range values
                    const [start, end] = rangeInput.split('-').map(Number);
                    if (!isNaN(start) && !isNaN(end || start)) {
                      // Replace the entire @... text with our formatted range
                      const beforeAt = newMessage.substring(0, lastAt);
                      const afterAt = newMessage.substring(lastAt).replace(/^@[^\s]*/, '');
                      newMessage = `${beforeAt}@${start}-${end || start}${afterAt}`;
                      showRangeSuggestions = false;
                    }
                  }
                }
              }}
            >
              <div class="font-medium">
                Select rows {rangeInput}
              </div>
              <ChevronDown class="h-4 w-4 text-blue-500" />
            </div>
          {/if}
        </div>
      {/if}
        <button 
          class="absolute right-2 top-1/2 transform -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          on:click={sendMessage}
          disabled={!newMessage.trim() || isApiLoading}
        >
          {#if isApiLoading}
            <Loader2 class="h-5 w-5 animate-spin" />
          {:else}
            <Send class="h-5 w-5" />
          {/if}
        </button>
    </div>
  </div>
</div>
