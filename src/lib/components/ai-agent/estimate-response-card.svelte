<script lang="ts">
  import { Eye, EyeOff } from 'lucide-svelte';

  export let content: string;
  export let messageId: string | undefined;
  export let expandedMessages: Set<string>;
  
  // Determine the type of operation from the content
  let operationType: 'created' | 'updated' | 'modified' = 'created';

  // Define the EstimateAction type
  type EstimateAction = {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  };

  // Toggle message expansion
  function toggleMessageExpansion() {
    if (!messageId) return;
    
    if (expandedMessages.has(messageId)) {
      expandedMessages.delete(messageId);
    } else {
      expandedMessages.add(messageId);
    }
    expandedMessages = expandedMessages; // Trigger reactivity
  }

  // Parse XML estimate actions
  function parseEstimateActions(content: string): EstimateAction[] {
    try {
      const estimateMatch = content.match(/<estimate>[\s\S]*?<\/estimate>/i);
      if (!estimateMatch) return [];
      
      const actionsMatch = estimateMatch[0].match(/<actions>[\s\S]*?<\/actions>/i);
      if (!actionsMatch) return [];
      
      const actionMatches = actionsMatch[0].matchAll(/<action>([\s\S]*?)<\/action>/gi);
      if (!actionMatches) return [];
      
      const actions: EstimateAction[] = [];
      
      for (const match of actionMatches) {
        const actionText = match[1];
        // Parse the action text which is in format: + ID:72, description='Labor Costs - Labor', quantity=4, unit_price=1000, amount=4000
        const idMatch = actionText.match(/ID:(\d+)/);
        const descriptionMatch = actionText.match(/description='([^']*)'/);
        const quantityMatch = actionText.match(/quantity=(\d+)/);
        const unitPriceMatch = actionText.match(/unit_price=(\d+)/);
        const amountMatch = actionText.match(/amount=(\d+)/);
        
        if (idMatch && descriptionMatch && quantityMatch && unitPriceMatch && amountMatch) {
          actions.push({
            id: idMatch[1],
            description: descriptionMatch[1],
            quantity: parseInt(quantityMatch[1]),
            unit_price: parseInt(unitPriceMatch[1]),
            amount: parseInt(amountMatch[1])
          });
        }
      }
      
      return actions;
    } catch (error) {
      console.error('Error parsing XML estimate:', error);
      return [];
    }
  }

  // Calculate total amount
  function calculateTotal(actions: EstimateAction[]): number {
    return actions.reduce((sum, action) => sum + action.amount, 0);
  }

  // Determine operation type based on content
  function determineOperationType(content: string): 'created' | 'updated' | 'modified' {
    if (content.includes('created new estimate')) {
      return 'created';
    } else if (content.includes('updated estimate')) {
      return 'updated';
    } else if (content.match(/\+\s*ID:|\-\s*ID:/)) {
      return 'modified';
    }
    return 'created'; // Default fallback
  }
  
  // Get message based on operation type
  function getOperationMessage(type: 'created' | 'updated' | 'modified'): string {
    switch (type) {
      case 'created':
        return 'Estimate created';
      case 'updated':
        return 'Estimate updated';
      case 'modified':
        return 'Estimate rows modified';
      default:
        return 'Estimate updated/created';
    }
  }
  
  // Get actions from the content
  $: actions = parseEstimateActions(content);
  $: totalAmount = calculateTotal(actions);
  $: isExpanded = messageId && expandedMessages.has(messageId);
  $: operationType = determineOperationType(content);
  $: operationMessage = getOperationMessage(operationType);
</script>

<div class="estimate-response-card">
  <div class="card-header">
    <div class="success-message">
      <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>{operationMessage}</span>
      <span class="total-badge">${totalAmount.toLocaleString()}</span>
    </div>
    <button 
      class="toggle-button"
      on:click|preventDefault={toggleMessageExpansion}
    >
      {#if isExpanded}
        <EyeOff class="h-4 w-4 mr-1" />
        <span>Hide</span>
      {:else}
        <Eye class="h-4 w-4 mr-1" />
        <span>View</span>
      {/if}
    </button>
  </div>
  
  {#if isExpanded}
    <div class="card-content">
      <div class="actions-list">
        {#each actions as action}
          <div class="action-item">
            <div class="action-header">
              <span class="action-description">{action.description}</span>
              <span class="action-amount">${action.amount.toLocaleString()}</span>
            </div>
            <div class="action-details">
              <span>{action.quantity} × ${action.unit_price.toLocaleString()}</span>
            </div>
          </div>
        {/each}
      </div>
      
      <details class="raw-xml">
        <summary>Raw XML</summary>
        <pre>{content}</pre>
      </details>
    </div>
  {/if}
</div>

<style>
  .estimate-response-card {
    width: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .success-message {
    display: flex;
    align-items: center;
    color: #10b981;
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .check-icon {
    height: 1rem;
    width: 1rem;
    margin-right: 0.375rem;
  }
  
  .toggle-button {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    color: #64748b;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: color 0.2s, background-color 0.2s;
  }
  
  .toggle-button:hover {
    color: #334155;
    background-color: #e2e8f0;
  }
  
  .card-content {
    padding: 0.75rem;
  }
  
  .total-badge {
    margin-left: 0.5rem;
    padding: 0.125rem 0.5rem;
    background-color: #10b981;
    color: white;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .actions-list {
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    overflow: hidden;
    margin-bottom: 0.75rem;
    background-color: white;
  }
  
  .action-item {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .action-item:last-child {
    border-bottom: none;
  }
  
  .action-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }
  
  .action-description {
    font-weight: 500;
    color: #334155;
  }
  
  .action-amount {
    font-weight: 500;
    color: #10b981;
  }
  
  .action-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #64748b;
  }
  
  .raw-xml {
    margin-top: 0.5rem;
    font-size: 0.75rem;
  }
  
  .raw-xml summary {
    cursor: pointer;
    color: #64748b;
    font-size: 0.875rem;
    user-select: none;
  }
  
  .raw-xml pre {
    margin-top: 0.25rem;
    padding: 0.5rem;
    background-color: #f1f5f9;
    border-radius: 0.375rem;
    font-size: 0.7rem;
    overflow-x: auto;
    white-space: pre-wrap;
    max-height: 150px;
    overflow-y: auto;
  }
</style>
