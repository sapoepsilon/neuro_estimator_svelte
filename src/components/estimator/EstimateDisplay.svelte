<script lang="ts">
  import { RevoGrid } from '@revolist/svelte-datagrid';
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { user } from '../../stores/authStore';

  export let result: any = null;
  let gridSource: any[] = [];
  let gridColumns: any[] = [];
  let showNewItemForm = false;
  let newItem = {
    description: '',
    quantity: 1,
    unitType: 'hour',
    unitPrice: 0,
    amount: 0
  };
  
  const dispatch = createEventDispatcher();
  
  const COLUMN_WIDTHS_KEY = 'neuro-estimator-column-widths';
  
  type ColumnRegular = {
    prop?: string;
    name?: string;
    size?: number;
    minSize?: number;
    maxSize?: number;
    sortable?: boolean;
    filter?: boolean;
    columnType?: string;
    cellTemplate?: (h: any, props: any) => any;
  };
  
  type ColumnResizeDetail = {
    [index: number]: ColumnRegular;
  };
  
  onMount(() => {
    loadColumnWidths();
  });
  
  $: if (result && result.estimate && result.estimate.lineItems) {
    prepareGridData(result);
  }
  
  function prepareGridData(data) {
    gridSource = [];
    gridColumns = [];
    
    if (!data.estimate || !data.estimate.lineItems) return;
    
    // Define default column settings
    const defaultColumns: ColumnRegular[] = [
      { 
        prop: 'description', 
        name: 'Description', 
        size: 250, 
        minSize: 200, 
        maxSize: 500,
        sortable: true,
        filter: true
      },
      { 
        prop: 'quantity', 
        name: 'Quantity', 
        size: 100, 
        minSize: 80, 
        maxSize: 150,
        sortable: true,
        filter: true,
        columnType: 'numeric'
      },
      { 
        prop: 'unitType', 
        name: 'Unit Type', 
        size: 100, 
        minSize: 80, 
        maxSize: 150,
        sortable: true,
        filter: true
      },
      { 
        prop: 'unitPrice', 
        name: 'Unit Price', 
        size: 120, 
        minSize: 100, 
        maxSize: 200,
        sortable: true,
        filter: true,
        columnType: 'numeric'
      },
      { 
        prop: 'amount', 
        name: 'Amount', 
        size: 120, 
        minSize: 100, 
        maxSize: 200,
        sortable: true,
        filter: true,
        columnType: 'numeric'
      },
      {
        prop: 'actions',
        name: 'Actions',
        size: 100,
        minSize: 80,
        maxSize: 120,
        cellTemplate: (h, props) => {
          // Don't show delete button for total row
          if (props.model.isTotal) {
            return h('div', {}, '');
          }
          return h(
            'button',
            {
              style: {
                background: 'none',
                border: 'none',
                color: 'red',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              },
              onClick: () => {
                handleDeleteItem(props.model);
              }
            },
            'Delete'
          );
        }
      },
    ];
    
    // Apply saved column widths if available, otherwise use defaults
    gridColumns = applySavedColumnWidths(defaultColumns);
    
    const flattenedItems = [];
    
    data.estimate.lineItems.forEach((item, index) => {
      flattenedItems.push({
        id: `item-${index}`,
        description: item.description,
        quantity: item.quantity,
        unitType: item.unitType,
        unitPrice: item.unitPrice,
        amount: item.amount,
        isHeader: true
      });
      
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem, subIndex) => {
          flattenedItems.push({
            id: `item-${index}-sub-${subIndex}`,
            description: `    ${subItem.description}`,
            quantity: subItem.quantity,
            unitType: subItem.unitType,
            unitPrice: subItem.unitPrice,
            amount: subItem.amount,
            isSubItem: true
          });
        });
      }
    });
    
    flattenedItems.push({
      id: 'total',
      description: 'Total',
      amount: data.estimate.totalAmount,
      isTotal: true
    });
    
    gridSource = flattenedItems;
  }
  
  // Save column widths to local storage
  function saveColumnWidths(columnDetails: {[index: number]: {prop: string, size: number}}) {
    try {
      const widthsToSave: {[prop: string]: number} = {};
      
      // Extract column widths from the resized columns
      Object.entries(columnDetails).forEach(([index, column]) => {
        widthsToSave[column.prop] = column.size;
      });
      
      // Get existing saved widths or initialize empty object
      const existingWidths = JSON.parse(localStorage.getItem(COLUMN_WIDTHS_KEY) || '{}');
      
      // Merge new widths with existing ones
      const updatedWidths = { ...existingWidths, ...widthsToSave };
      
      // Save to local storage
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(updatedWidths));
    } catch (error) {
      console.error('Error saving column widths to local storage:', error);
    }
  }
  
  // Load column widths from local storage
  function loadColumnWidths() {
    try {
      // This just loads the data from localStorage
      // Actual application happens in applySavedColumnWidths
      return JSON.parse(localStorage.getItem(COLUMN_WIDTHS_KEY) || '{}');
    } catch (error) {
      console.error('Error loading column widths from local storage:', error);
      return {};
    }
  }
  
  // Apply saved column widths to the default column settings
  function applySavedColumnWidths(defaultColumns: ColumnRegular[]) {
    const savedWidths = loadColumnWidths();
    
    // Return a new array with potentially updated sizes
    return defaultColumns.map(column => {
      if (savedWidths[column.prop]) {
        return { ...column, size: savedWidths[column.prop] };
      }
      return column;
    });
  }
  
  // Calculate amount based on quantity and unit price
  function calculateAmount() {
    newItem.amount = newItem.quantity * newItem.unitPrice;
  }
  
  // Handle adding a new item
  async function addNewItem() {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    calculateAmount();
    
    try {
      // Get the project ID directly from the URL parameters
      const hash = window.location.hash;
      const queryString = hash.split('?')[1];
      const params = new URLSearchParams(queryString || '');
      const projectId = params.get('id') ? parseInt(params.get('id')) : null;
      
      if (!projectId) {
        alert('Project ID not found');
        return;
      }
      
      // Prepare the data to send to Supabase
      const itemData = {
        project_id: projectId,
        title: newItem.description,
        description: newItem.description,
        quantity: newItem.quantity,
        unit_price: newItem.unitPrice,
        unit_type: newItem.unitType,
        amount: newItem.amount,
        currency: result.estimate?.currency || 'USD',
        total_amount: newItem.amount,
        status: 'draft',
        is_sub_item: false,
        created_by: $user?.id,
        data: {
          tags: [],
          notes: '',
          ai_generated: false
        }
      };
      
      // Add the item using Supabase
      const { data: savedItem, error } = await supabase
        .from('estimate_items')
        .insert(itemData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Dispatch an event to notify parent components that a new item was added
      dispatch('itemAdded', savedItem);
      
      // Reset the form
      newItem = {
        description: '',
        quantity: 1,
        unitType: 'hour',
        unitPrice: 0,
        amount: 0
      };
      
      // Hide the form
      showNewItemForm = false;
      
    } catch (error) {
      console.error('Error adding new item:', error);
      alert('Failed to add new item. Please try again.');
    }
  }
  
  // Toggle the new item form
  function toggleNewItemForm() {
    showNewItemForm = !showNewItemForm;
  }
  
  // Handle deleting an item
  async function handleDeleteItem(item) {
    if (!item || !item.id) {
      console.error('No item ID found for deletion');
      return;
    }
    
    // Extract the actual ID from the item ID (format: 'item-X' or 'item-X-sub-Y')
    let itemId;
    try {
      // For main items, the format is 'item-{index}'
      // For sub items, the format is 'item-{index}-sub-{subIndex}'
      // We need to get the actual database ID from the item
      
      // Get the project ID from URL
      const hash = window.location.hash;
      const queryString = hash.split('?')[1];
      const params = new URLSearchParams(queryString || '');
      const projectId = params.get('id') ? parseInt(params.get('id')) : null;
      
      if (!projectId) {
        alert('Project ID not found');
        return;
      }
      
      // Find the item in the database based on its properties
      const { data: items, error: fetchError } = await supabase
        .from('estimate_items')
        .select('id, title, quantity, unit_price')
        .eq('project_id', projectId)
        .eq('title', item.description)
        .eq('quantity', item.quantity)
        .eq('unit_price', item.unitPrice);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!items || items.length === 0) {
        alert('Item not found in database');
        return;
      }
      
      // Use the first matching item's ID
      itemId = items[0].id;
      
    } catch (error) {
      console.error('Error finding item for deletion:', error);
      alert('Failed to identify the item for deletion');
      return;
    }
    
    if (confirm(`Are you sure you want to delete this item?`)) {
      try {
        const { error } = await supabase
          .from('estimate_items')
          .delete()
          .eq('id', itemId);
        
        if (error) {
          throw error;
        }
        
        // Dispatch an event to notify parent components that an item was deleted
        dispatch('itemDeleted', { itemId });
        
        alert('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item. Please try again.');
      }
    }
  }
</script>

{#if gridSource.length > 0}
  <div class="bg-white rounded-md shadow mb-4">
    <div class="p-4 bg-slate-50 rounded-t-md border-b">
      <div class="flex justify-between items-center">
        <div>
          <h4 class="font-medium">{result.estimate?.title || 'Project Estimate'}</h4>
          <p class="text-sm text-slate-500">Currency: {result.estimate?.currency || 'USD'}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold">{result.estimate?.totalAmount || 0} {result.estimate?.currency || 'USD'}</p>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button 
          on:click={toggleNewItemForm} 
          class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {showNewItemForm ? 'Cancel' : 'Add New Item'}
        </button>
      </div>
      
      {#if showNewItemForm}
        <div class="mt-4 p-4 bg-slate-100 rounded-md">
          <h5 class="font-medium mb-3">Add New Estimate Item</h5>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="col-span-1 md:col-span-2">
              <label for="item-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input 
                id="item-description"
                type="text" 
                bind:value={newItem.description} 
                class="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Item description"
              />
            </div>
            <div>
              <label for="item-quantity" class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input 
                id="item-quantity"
                type="number" 
                bind:value={newItem.quantity} 
                min="0.01" 
                step="0.01"
                on:input={calculateAmount}
                class="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label for="item-unit-type" class="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
              <select 
                id="item-unit-type"
                bind:value={newItem.unitType} 
                class="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="item">Item</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label for="item-unit-price" class="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
              <input 
                id="item-unit-price"
                type="number" 
                bind:value={newItem.unitPrice} 
                min="0.01" 
                step="0.01"
                on:input={calculateAmount}
                class="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div class="mt-4 flex justify-between items-center">
            <div>
              <span class="text-sm font-medium">Total Amount: </span>
              <span class="font-bold">{newItem.amount} {result.estimate?.currency || 'USD'}</span>
            </div>
            <button 
              on:click={addNewItem} 
              class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Save Item
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  <div class="grid-container">
    <RevoGrid
      source={gridSource} 
      columns={gridColumns}
      theme="material"
      resize={true}
      on:aftercolumnresize={(e) => {
        saveColumnWidths(e.detail);
      }}
      autoSizeColumn={true}
      exporting={true}
      stretch={true}
      useClipboard={true}
      range={true}
      filter={true}
      trimmedRows={false}
      canSort={true}
      columnFilterConfig={{
        debounceTime: 250,
        include: true,
        showHeaderFilter: true
      }}
      sortable={{
        multiple: true,
        tripleState: true
      }}
      rowClass={(row) => {
        if (row.isHeader) return 'font-semibold bg-slate-100';
        if (row.isSubItem) return 'text-sm text-slate-600';
        if (row.isTotal) return 'font-bold text-lg border-t-2';
        return '';
      }}
    />
  </div>
{:else}
  <div class="bg-slate-50 p-4 rounded-md">
    <pre class="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
  </div>
{/if}