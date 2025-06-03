<script lang="ts">
  import { onMount, getContext, createEventDispatcher } from 'svelte';
  import { Send, Loader2, X, ChevronDown, Globe } from 'lucide-svelte';
  import { supabase } from "$lib/supabase";
  import { user } from "../../../stores/authStore";
  import { gridData, currentProjectId } from "../../../stores/gridStore";
  import { selectedRange as selectedRangeStore } from "../../../stores/rangeSelectionStore";
  import { messageInput } from "../../../stores/messageInputStore";
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
  
  let messages: Message[] = [];
  let internalConversationId: string | null = conversationId;
  let isLoading = true;
  let isApiLoading = false; 
  let loadError: string | null = null;
  let chatContainer: HTMLElement;
  let expandedMessages: Set<string> = new Set();
  let rangeInput = '';
  let showRangeSuggestions = false;
  let rangeStart = 0;
  let rangeEnd = 0;
  let gridItems: Array<{id: string, name: string, row: number, rowNumber?: number}> = [];
  let selectedRange: { start: number, end: number } | null = null;
  let rangeSelectionComplete = false;
  let webSearchEnabled = false; 
  
  $: if ($gridData && $gridData.gridSource) {
    console.log('Grid data updated:', $gridData.gridSource.length, 'items');
    gridItems = $gridData.gridSource
      .filter((item: any) => item?.description)
      .map((item: any, index: number) => ({
        id: item.id || `row-${index}`,
        name: item.description || `Item ${index + 1}`,
        row: index + 1,  // Grid position (what user sees)
        rowNumber: item.rowNumber || item.row_number // Database row number
      }));
    console.log('Processed grid items:', gridItems.length);
  }
  
  function handleAtKey() {
    rangeSelectionComplete = false;
    
    const cursorPos = (document.activeElement as HTMLInputElement).selectionStart || 0;
    const textBeforeCursor = $messageInput.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    if (lastAt !== -1) {
      rangeStart = lastAt;
      showRangeSuggestions = true;
      console.log('@ key pressed, showing suggestions. Grid items:', gridItems.length);
      
      if (lastAt === cursorPos - 1) {
        rangeInput = '';
      } else {
        rangeInput = textBeforeCursor.substring(lastAt + 1, cursorPos);
      }
    }
  }
  
  function selectRange(start: number, end: number) {
    const rangeText = `@${start}-${end}`;
    const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
    const textBeforeCursor = $messageInput.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    if (lastAt !== -1) {
      const beforeAt = $messageInput.substring(0, lastAt);
      const afterRange = $messageInput.substring(lastAt).replace(/^@[^\s]*/, '');
      $messageInput = `${beforeAt}${rangeText}${afterRange}`;
    } else {
      $messageInput += rangeText;
    }
    
    showRangeSuggestions = false;
    
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 0);
  }

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
  
  function applyRange() {
    const range = parseRange(rangeInput);
    if (range) {
      selectRange(range.start, range.end);
    }
  }

  function clearRange() {
    selectedRange = null;
  }
  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === '@') {
      showRangeSuggestions = true;
      event.preventDefault();
      $messageInput = $messageInput + '@';
      setTimeout(() => {
        const rangeInputEl = document.getElementById('range-input');
        if (rangeInputEl) rangeInputEl.focus();
      }, 0);
    }
  }

  const dispatch = createEventDispatcher();

  async function loadConversationHistory() {
    if ((!projectId && !internalConversationId) || !$user) {
      isLoading = false;
      return;
    }
    
    try {
      isLoading = true;
      loadError = null;
      
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
          internalConversationId = conversationData[0].id;
        }
      }
        
      if (internalConversationId) {
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
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  }
  
  async function sendMessage() {
    if (!$messageInput.trim() || !$user) return;
    showRangeSuggestions = false;
    const rangeReferences: Array<{range: {start: number, end: number}, text: string}> = [];
    const rowNumbers: number[] = [];
    
    const messageWithRanges = $messageInput.replace(/@(\d+)(?:-(\d+))?/g, (match, start, end) => {
      const gridStart = parseInt(start, 10);
      const gridEnd = end ? parseInt(end, 10) : gridStart;
      
      // Convert grid positions to database row numbers
      const selectedGridItems = gridItems.filter(item => 
        item.row >= gridStart && item.row <= gridEnd
      );
      
      selectedGridItems.forEach(item => {
        if (item.rowNumber && !rowNumbers.includes(item.rowNumber)) {
          rowNumbers.push(item.rowNumber);
        }
      });
      
      const range = {
        start: gridStart,
        end: gridEnd
      };
      const rangeId = `range_${range.start}_${range.end}`;
      rangeReferences.push({ range, text: `[Rows ${range.start}-${range.end}]` });
      return `[${rangeId}]`;
    });
    let displayMessage = $messageInput;
    rangeReferences.forEach(ref => {
      displayMessage = displayMessage.replace(
        `@${ref.range.start}-${ref.range.end}`, 
        `<span class="bg-accent-light text-accent-custom px-1 rounded">@${ref.range.start}-${ref.range.end}</span>`
      );
    });
    
    const userMessage: MessageBase = {
      role: 'user' as const,
      content: displayMessage
    };
    
    messages = [...messages, userMessage];
    
    const messageContent = $messageInput;
    $messageInput = '';
    
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
    
    messages = [...messages, {
      role: 'assistant',
      content: '...',
      loading: true
    } as LoadingMessage];
    
    try {
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
      
      isApiLoading = true;
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
            rowNumbers: rowNumbers.length > 0 ? rowNumbers : undefined,
            useMcp: true,
            should_use_web: webSearchEnabled
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          isApiLoading = false;
          throw new Error(`API responded with status: ${response.status}. Details: ${errorText}`);
        }
        
        data = await response.json();
      } catch (apiError) {
        console.error('API call error details:', apiError);
        isApiLoading = false;
        messages = [...messages, {
          role: 'system',
          content: `Error connecting to AI agent: ${apiError.message || 'Unknown error'}`,
          error: true
        } as ErrorMessage];
        return;
      }
      
      isApiLoading = false;
      
      const assistantResponse: MessageBase = {
        role: 'assistant' as const,
        content: data.response || 'Completed'
      };
      
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
            messages = [...messages, assistantResponse];
          } else if (savedMessage) {
            messages = [...messages, savedMessage as MessageBase];
          }
        } catch (error) {
          console.error('Error saving assistant message:', error);
          messages = [...messages, assistantResponse];
        }
      } else {
        messages = [...messages, assistantResponse];
      }
      
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
      isApiLoading = false;
      messages = messages.filter(m => !('loading' in m));
      messages = [...messages, {
        role: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        error: true
      } as ErrorMessage];
    }
  }
  
  function containsXmlEstimate(content: string): boolean {
    return content.includes('<estimate>') && content.includes('</estimate>');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === '@') {
      handleAtKey();
      return;
    }
    
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      
      if (showRangeSuggestions) {
        showRangeSuggestions = false;
        const cursorPos = (event.target as HTMLInputElement)?.selectionStart || 0;
        const textBeforeCursor = $messageInput.substring(0, cursorPos);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        
        if (lastAt !== -1) {
          const textAfterAt = textBeforeCursor.substring(lastAt + 1);
          const match = textAfterAt.match(/^(\d+)(?:-(\d+))?/);
          
          if (match) {
            const start = parseInt(match[1], 10);
            const end = match[2] ? parseInt(match[2], 10) : start;
            
            if (!isNaN(start) && !isNaN(end)) {
              const beforeAt = $messageInput.substring(0, lastAt);
              const afterRange = $messageInput.substring(lastAt + textAfterAt.length + 1);
              const rangeText = `@${start}-${end}`;
              $messageInput = `${beforeAt}${rangeText}${afterRange}`;
              
              rangeSelectionComplete = true;
              return;
            }
          }
        }
      } else {
        sendMessage();
      }
    } 
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
  
  $: if ($selectedRangeStore) {
    console.log('AgentChat received range:', $selectedRangeStore);
    
    if ($messageInput.trim() === '') {
      $messageInput = $selectedRangeStore + ' ';
    } else {
      $messageInput = $messageInput.trim() + ' ' + $selectedRangeStore + ' ';
    }
    console.log('Updated messageInput to:', $messageInput);
    
    selectedRangeStore.set(null);
    
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Type your message..."]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 100);
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
    <div class="relative">
      <input
        type="text"
        class="w-full p-2 pr-24 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Type your message..."
        bind:value={$messageInput}
        on:keydown={handleKeydown}
          on:input={(e) => {
          if (rangeSelectionComplete) {
            const input = e.target as HTMLInputElement;
            const cursorPos = input.selectionStart || 0;
            if (cursorPos > 0 && $messageInput.charAt(cursorPos - 1) === '@') {
              rangeSelectionComplete = false;
            } else {
              return;
            }
          }
          
          if ($messageInput.includes('@') && !showRangeSuggestions) {
            handleAtKey();
            return;
          }
          
          if (showRangeSuggestions) {
            const cursorPos = (e.target as HTMLInputElement).selectionStart || 0;
            const textBeforeCursor = $messageInput.substring(0, cursorPos);
            const lastAt = textBeforeCursor.lastIndexOf('@');
            
            if (lastAt === -1) {
              showRangeSuggestions = false;
              return;
            }
            
            const textAfterAt = textBeforeCursor.substring(lastAt + 1);
            rangeInput = textAfterAt;
            
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
        <div class="absolute bottom-full left-0 mb-2 w-full bg-white border border-neutral-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          <div class="p-2 border-b bg-neutral-50">
            <div class="text-xs font-medium text-neutral-400">Select rows to reference</div>
          </div>
          {#each gridItems as item}
            {#if rangeInput === '' || String(item.row).includes(rangeInput) || 
                (rangeInput.includes('-') && item.row >= rangeStart && item.row <= rangeEnd)}
              <div 
               role="button"
               tabindex="0"
               class="p-2 hover:bg-neutral-50 cursor-pointer flex items-center justify-between"
               on:mousedown|preventDefault={() => {
                 const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
                 const textBeforeCursor = $messageInput.substring(0, cursorPos);
                 const lastAt = textBeforeCursor.lastIndexOf('@');
                 
                 if (lastAt !== -1) {
                   const beforeAt = $messageInput.substring(0, lastAt);
                   const afterAt = $messageInput.substring(lastAt).replace(/^@[^\s]*/, '');
                   const rangeText = `@${item.row}`;
                   $messageInput = `${beforeAt}${rangeText}${afterAt}`;
                   showRangeSuggestions = false;
                   rangeSelectionComplete = true;
                 }
               }}
               on:keydown={(e) => e.key === 'Enter' && selectRange(item.row, item.row)}
              >
                <div class="truncate">
                  <span class="font-mono text-xs text-neutral-400 mr-2">#{item.row}</span>
                  <span>{item.name}</span>
                </div>
                <ChevronDown class="h-4 w-4 text-neutral-400 transform rotate-90" />
              </div>
            {/if}
          {/each}
          {#if rangeInput.includes('-')}
            <div 
              role="button"
              tabindex="0"
              class="p-2 bg-accent-light hover:bg-accent-light cursor-pointer flex items-center justify-between border-t"
              on:mousedown|preventDefault={() => {
                const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
                const textBeforeCursor = $messageInput.substring(0, cursorPos);
                const lastAt = textBeforeCursor.lastIndexOf('@');
                
                if (lastAt !== -1) {
                  const [start, end] = rangeInput.split('-').map(Number);
                  if (!isNaN(start) && !isNaN(end || start)) {
                    const beforeAt = $messageInput.substring(0, lastAt);
                    const afterAt = $messageInput.substring(lastAt).replace(/^@[^\s]*/, '');
                    const rangeText = `@${start}-${end || start}`;
                    $messageInput = `${beforeAt}${rangeText}${afterAt}`;
                    showRangeSuggestions = false;
                    rangeSelectionComplete = true;
                  }
                }
              }}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart || 0;
                  const textBeforeCursor = $messageInput.substring(0, cursorPos);
                  const lastAt = textBeforeCursor.lastIndexOf('@');
                  
                  if (lastAt !== -1) {
                    const [start, end] = rangeInput.split('-').map(Number);
                    if (!isNaN(start) && !isNaN(end || start)) {
                      const beforeAt = $messageInput.substring(0, lastAt);
                      const afterAt = $messageInput.substring(lastAt).replace(/^@[^\s]*/, '');
                      $messageInput = `${beforeAt}@${start}-${end || start}${afterAt}`;
                      showRangeSuggestions = false;
                    }
                  }
                }
              }}
            >
              <div class="font-medium">
                Select rows {rangeInput}
              </div>
              <ChevronDown class="h-4 w-4 text-accent-custom" />
            </div>
          {/if}
        </div>
      {/if}
        <button
          type="button"
          class="absolute right-12 top-1/2 transform -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors hover:bg-neutral-50"
          on:click={() => webSearchEnabled = !webSearchEnabled}
          title={webSearchEnabled ? 'Disable web search' : 'Enable web search'}
          data-testid="web-search-toggle"
        >
          <Globe class="h-5 w-5 {webSearchEnabled ? 'text-accent-custom' : 'text-neutral-400'}" />
        </button>
        <button 
          class="absolute right-2 top-1/2 transform -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          on:click={sendMessage}
          disabled={!$messageInput.trim() || isApiLoading}
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
