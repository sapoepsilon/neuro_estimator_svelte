<script lang="ts">
  import { onMount } from 'svelte';
  import { Send, Loader2 } from 'lucide-svelte';
  import { supabase } from "$lib/supabase";
  import { user } from "../../../stores/authStore";
  import { API_AGENT_PROMPT_URL } from '../ui/sidebar/constants';
  
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
  let loadError: string | null = null;
  
  let newMessage = '';
  let chatContainer: HTMLElement;
  
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
        }
      } else {
        messages = [
          {
            role: 'assistant' as const,
            content: projectName 
              ? `Welcome to the Neuro Estimator AI Agent for project "${projectName}". How can I help you with your estimation?`
              : 'Welcome to the Neuro Estimator AI Agent. How can I help you with your estimation?'
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
    
    // Add user message to chat
    const userMessage: MessageBase = {
      role: 'user' as const,
      content: newMessage
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
            prompt: messageContent,
            userId: $user?.id,
            conversationId: internalConversationId
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API responded with status: ${response.status}. Details: ${errorText}`);
        }
        
        data = await response.json();
      } catch (apiError) {
        console.error('API call error details:', apiError);
        messages = [...messages, {
          role: 'system',
          content: `Error connecting to AI agent: ${apiError.message || 'Unknown error'}`,
          error: true
        } as ErrorMessage];
        return;
      }
      
      const assistantResponse: MessageBase = {
        role: 'assistant' as const,
        content: data.response || 'Completed'
      };
      
      messages = [...messages, assistantResponse];
      
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error sending message to AI agent:', error);
      
      messages = messages.filter(m => !('loading' in m));
      messages = [...messages, {
        role: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        error: true
      } as ErrorMessage];
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
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
              <p class="whitespace-pre-wrap break-words">{message.content}</p>
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
    <div class="flex items-center space-x-2">
      <input
        type="text"
        class="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Type your message..."
        bind:value={newMessage}
        on:keydown={handleKeydown}
      />
      <button 
        class="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        on:click={sendMessage}
        disabled={!newMessage.trim()}
      >
        <Send class="h-5 w-5" />
      </button>
    </div>
  </div>
</div>
