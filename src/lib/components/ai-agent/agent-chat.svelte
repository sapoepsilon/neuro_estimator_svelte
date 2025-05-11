<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Send } from 'lucide-svelte';
  
  // Props
  export let onBackToRegularMode = () => {};
  export let projectId: string | null = null;
  export let projectName: string | null = null;
  
  // Define message types
  type MessageBase = {
    role: 'user' | 'system';
    content: string;
  }
  
  type LoadingMessage = MessageBase & {
    loading: boolean;
  }
  
  type ErrorMessage = MessageBase & {
    error: boolean;
  }
  
  type Message = MessageBase | LoadingMessage | ErrorMessage;
  
  // Chat state
  let messages: Message[] = [
    {
      role: 'system',
      content: projectName 
        ? `Welcome to the Neuro Estimator AI Agent for project "${projectName}". How can I help you with your estimation?`
        : 'Welcome to the Neuro Estimator AI Agent. How can I help you with your estimation?'
    }
  ];
  
  let newMessage = '';
  let chatContainer: HTMLElement;
  
  // Function to send message to AI agent
  async function sendMessage() {
    if (!newMessage.trim()) return;
    
    // Add user message to chat
    messages = [...messages, {
      role: 'user',
      content: newMessage
    }];
    
    // Clear input
    const userMessage = newMessage;
    newMessage = '';
    
    // Scroll to bottom
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
    
    // Add loading message
    messages = [...messages, {
      role: 'system',
      content: '...',
      loading: true
    } as LoadingMessage];
    
    try {
      // In a real implementation, this would call your server
      // For now, we'll simulate a response after a delay
      setTimeout(() => {
        // Replace loading message with AI response
        messages = messages.filter(m => !('loading' in m));
        messages = [...messages, {
          role: 'system',
          content: `This is a simulated response to: "${userMessage}". In a real implementation, this would come from your server. The project ID is ${projectId || 'not specified'}.`
        }];
        
        // Scroll to bottom
        setTimeout(() => {
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
      }, 1500);
    } catch (error) {
      console.error('Error sending message to AI agent:', error);
      
      // Replace loading message with error
      messages = messages.filter(m => !('loading' in m));
      messages = [...messages, {
        role: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        error: true
      } as ErrorMessage];
    }
  }
  
  // Handle Enter key to send message
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
  
  // Scroll to bottom on mount
  onMount(() => {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-4 border-b flex items-center">
    <button 
      class="p-1 mr-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" 
      on:click={onBackToRegularMode}
      aria-label="Back to regular mode"
    >
      <ArrowLeft class="h-5 w-5" />
    </button>
    <h2 class="text-lg font-semibold">AI Estimating Agent</h2>
  </div>
  
  <!-- Chat Container -->
  <div 
    class="flex-1 overflow-auto p-4 space-y-4"
    bind:this={chatContainer}
  >
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
          {/if}
        </div>
      </div>
    {/each}
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
