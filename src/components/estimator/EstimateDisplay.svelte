<script lang="ts">
  import { RevoGrid } from '@revolist/svelte-datagrid';
  import { onMount, setContext } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase';
  import * as XLSX from 'xlsx';
  import { user } from '../../stores/authStore';
  import { gridData, currentProjectId } from '../../stores/gridStore';
  import { toast } from "svelte-sonner";

  export let result: any = null;
  export let projectId: string | null = null;
  let gridSource: any[] = [];
  let gridColumns: any[] = [];
  let showNewItemForm = false;
  let newItem = {
    description: '',
    quantity: 1,
    unitType: 'hour',
    unitPrice: 0,
    amount: 0,
    costType: 'material'
  };
  
  const dispatch = createEventDispatcher();
  
  const COLUMN_WIDTHS_KEY = 'neuro-estimator-column-widths';
  
  // Create a context for grid data access
  setContext('getGridData', () => {
    return { gridSource, gridColumns };
  });
  
  // Update the grid store whenever data changes
  $: {
    $gridData = { gridSource, gridColumns };
    $currentProjectId = projectId;
  }
  
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
    editor?: boolean | string;
    editorSource?: Array<{label: string, value: string}>;
    readonly?: boolean | ((props: any) => boolean);
  };
  
  type ColumnResizeDetail = {
    [index: number]: ColumnRegular;
  };
  
  onMount(() => {
    loadColumnWidths();
    if (projectId && !result) {
      loadProjectData(projectId);
    }
    
    // Improve mobile touch handling
    if (typeof window !== 'undefined') {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      
      if (isMobile) {
        // Add a small delay to handle touch events better
        setTimeout(() => {
          const gridContainer = document.querySelector('.grid-container');
          if (gridContainer) {
            // Prevent default touch behavior that might cause focus issues
            gridContainer.addEventListener('touchmove', (e) => {
              const target = e.target as HTMLElement;
              if (target && target.closest && target.closest('.revogr-cell')) {
                e.stopPropagation();
              }
            }, { passive: true });
            
            // Ensure cells maintain focus on touch
            gridContainer.addEventListener('touchend', (e) => {
              const target = e.target as HTMLElement;
              if (target && target.closest) {
                const cell = target.closest('.revogr-cell') as HTMLElement;
                if (cell) {
                  // Small delay to ensure the touch event completes
                  setTimeout(() => {
                    cell.click();
                  }, 10);
                }
              }
            }, { passive: true });
          }
        }, 500);
      }
    }
  });
  
  $: if (result && result.estimate && result.estimate.lineItems) {
    prepareGridData(result);
  }
  
  // Track previous projectId to prevent unnecessary reloads
  let previousProjectId: string | null = null;
  
  $: if (projectId && projectId !== previousProjectId) {
    // Only update when projectId actually changes to a new value
    console.log('ProjectId changed from', previousProjectId, 'to', projectId);
    previousProjectId = projectId;
    loadProjectData(projectId);
  }
  
  // Function to load project data from the database
  async function loadProjectData(id: string) {
    if (!id) return;
    
    try {
      console.log('Loading project data for ID:', id);
      
      // Fetch the project data from Supabase
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (projectError) throw projectError;
      console.log('Project data loaded:', projectData);
      
      // Fetch the estimate items for this project
      const { data: estimateItems, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: true });
      
      if (itemsError) throw itemsError;
      console.log('Estimate items loaded:', estimateItems);
      
      // Format the data to match the expected structure for the grid
      const formattedResult = {
        estimate: {
          title: projectData.name,
          description: projectData.description,
          currency: 'USD',
          lineItems: estimateItems.map(item => {
            console.log('Processing item with ID:', item.id);
            return {
              id: item.id,
              description: item.title,
              quantity: item.quantity,
              unitType: item.unit_type,
              costType: item.cost_type || 'material',
              unitPrice: item.unit_price,
              amount: item.amount,
              subItems: []
            };
          }),
          totalAmount: estimateItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        }
      };
      
      // Update the result
      result = formattedResult;
      prepareGridData(formattedResult);
    } catch (error) {
      console.error('Error loading project data:', error);
      toast.error('Error loading project data: ' + error.message);
    }
  }
  
  // Function to refresh the data - can be called from outside
  export function refreshData() {
    console.log('Refreshing data for project ID:', projectId);
    if (projectId) {
      loadProjectData(projectId);
    }
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
        filter: true,
        editor: true,
        readonly: (props) => props.model.isTotal || props.model.isSubItem
      },
      { 
        prop: 'quantity', 
        name: 'Quantity', 
        size: 100, 
        minSize: 80, 
        maxSize: 150,
        sortable: true,
        filter: true,
        columnType: 'numeric',
        editor: 'number',
        readonly: (props) => props.model.isTotal || props.model.isSubItem
      },
      { 
        prop: 'unitType', 
        name: 'Unit Type', 
        size: 100, 
        minSize: 80, 
        maxSize: 150,
        sortable: true,
        filter: true,
        editor: 'select',
        editorSource: [
          { label: 'Hour', value: 'hour' },
          { label: 'Day', value: 'day' },
          { label: 'Unit', value: 'unit' },
          { label: 'Square Foot', value: 'sq-ft' },
          { label: 'Board Foot', value: 'board-ft' },
          { label: 'Package', value: 'package' },
          { label: 'Linear Foot', value: 'linear-ft' }
        ],
        readonly: (props) => props.model.isTotal || props.model.isSubItem
      },
      { 
        prop: 'costType', 
        name: 'Cost Type', 
        size: 100, 
        minSize: 80, 
        maxSize: 150,
        sortable: true,
        filter: true,
        editor: 'select',
        editorSource: [
          { label: 'Material', value: 'material' },
          { label: 'Labor', value: 'labor' },
          { label: 'Equipment', value: 'equipment' },
          { label: 'Subcontractor', value: 'subcontractor' },
          { label: 'Other', value: 'other' }
        ],
        readonly: (props) => props.model.isTotal || props.model.isSubItem
      },
      { 
        prop: 'unitPrice', 
        name: 'Unit Price', 
        size: 120, 
        minSize: 100, 
        maxSize: 200,
        sortable: true,
        filter: true,
        columnType: 'numeric',
        editor: 'number',
        readonly: (props) => props.model.isTotal || props.model.isSubItem
      },
      { 
        prop: 'amount', 
        name: 'Amount', 
        size: 120, 
        minSize: 100, 
        maxSize: 200,
        sortable: true,
        filter: true,
        columnType: 'numeric',
        readonly: true
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
        id: item.id, // Use the actual database ID directly
        description: item.description,
        quantity: item.quantity,
        unitType: item.unitType,
        costType: item.costType || 'material',
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
    newItem.amount = parseFloat(newItem.amount.toFixed(2));
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
        unit_type: newItem.unitType, // This will use the selected unit type from the dropdown
        cost_type: newItem.costType,
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
      
      console.log('Adding new item with unit type:', newItem.unitType);
      
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
      
      // Reset the form but keep the last used unit type and cost type for convenience
      const lastUnitType = newItem.unitType;
      const lastCostType = newItem.costType;
      newItem = {
        description: '',
        quantity: 1,
        unitType: lastUnitType, // Keep the last selected unit type
        costType: lastCostType, // Keep the last selected cost type
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
    
    // If we're showing the form, recalculate the amount to ensure it's correct
    if (showNewItemForm) {
      calculateAmount();
    }
  }
  
  // Handle deleting an item
  async function handleDeleteItem(item) {
    if (!item || !item.id) {
      console.error('No item ID found for deletion');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${item.description || 'this item'}?`)) {
      try {
        const { error } = await supabase
          .from('estimate_items')
          .delete()
          .eq('id', item.id);
        
        if (error) throw error;
        
        // Refresh the data
        dispatch('refresh');
        alert('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item. Please try again.');
      }
    }
  }

  // Handle cell edit event
  async function handleCellEdit(editEvent) {
    try {
      console.log(`handleCellEdit: ${JSON.stringify(editEvent)}`);
      
      // Extract the edited cell data - RevoGrid uses a different structure
      const { prop, model, val, value: oldVal, rowIndex } = editEvent;
      
      console.log('Cell edit event processed:', { prop, model, val, oldVal, rowIndex });
      
      // Skip if value hasn't changed
      if (val === oldVal) return;
      
      // The model contains the row data directly
      const rowData = model;
      console.log('Row data from model:', rowData);
      
      if (!rowData || rowData.isTotal) return;
      
      // Get the item ID directly from the model
      let itemId = rowData.id;
      console.log('Item ID from model:', itemId);
      
      // If the ID is not a number, try to extract it from the string format
      if (typeof itemId === 'string' && itemId.startsWith('item-')) {
        const parts = itemId.split('-');
        if (parts.length > 1 && !isNaN(Number(parts[1]))) {
          itemId = Number(parts[1]);
        }
      }
      
      console.log('Final itemId for database update:', itemId);
      
      // If we still don't have a valid ID, we can't update the database
      if (!itemId) {
        console.error('No valid item ID found for database update');
        toast.error('Could not update: No valid item ID');
        return;
      }
      
      // Calculate new amount if quantity or unitPrice changed
      let newAmount = rowData.amount;
      if (prop === 'quantity' || prop === 'unitPrice') {
        // Parse values to ensure they're numbers
        const quantity = prop === 'quantity' ? parseFloat(val) : parseFloat(rowData.quantity);
        const unitPrice = prop === 'unitPrice' ? parseFloat(val) : parseFloat(rowData.unitPrice);
        
        // Update the local data
        if (prop === 'quantity') {
          rowData.quantity = quantity;
        } else if (prop === 'unitPrice') {
          rowData.unitPrice = unitPrice;
        }
        
        // Recalculate amount
        newAmount = quantity * unitPrice;
        rowData.amount = newAmount;
        
        console.log('Recalculated amount:', newAmount);
        
        // Update the grid source to reflect the new amount
        // We need to update the specific row in the data array
        if (editEvent.data && Array.isArray(editEvent.data)) {
          // Find the index of the row in the data array
          const dataIndex = editEvent.data.findIndex(item => item.id === itemId);
          if (dataIndex >= 0) {
            editEvent.data[dataIndex].amount = newAmount;
            // Update the grid source
            gridSource = [...editEvent.data];
          }
        } else {
          // Fallback to refreshing all data
          refreshData();
        }
        
        // Also need to update the total row
        updateTotalAmount();
      }
      
      // Map grid property names to database column names
      const propToColumnMap = {
        'description': 'title',
        'quantity': 'quantity',
        'unitType': 'unit_type',
        'costType': 'cost_type',
        'unitPrice': 'unit_price',
        'amount': 'amount'
      };
      
      // Prepare data for database update
      const updateData: Record<string, any> = {};
      
      // Handle different data types appropriately
      if (prop === 'quantity' || prop === 'unitPrice') {
        // Make sure we're sending a number to the database
        const numValue = typeof val === 'string' ? parseFloat(val) : val;
        updateData[propToColumnMap[prop]] = isNaN(numValue) ? 0 : numValue;
      } else {
        updateData[propToColumnMap[prop] || prop] = val;
      }
      
      // If amount was recalculated, update that too
      if (prop === 'quantity' || prop === 'unitPrice') {
        updateData.amount = newAmount;
        updateData.total_amount = newAmount; // Update total_amount field too
      }
      
      console.log('Sending update to database:', { itemId, updateData });
      
      try {
        // Update the database
        const { data, error } = await supabase
          .from('estimate_items')
          .update(updateData)
          .eq('id', itemId)
          .select();
        
        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        
        console.log('Database update successful:', data);
        
        // Show success toast
        toast.success('Item updated successfully');
        
        // Refresh the data to ensure UI is in sync with database
        // Use a short timeout to allow the UI to update first
        setTimeout(() => {
          refreshData();
        }, 100);
      } catch (dbError) {
        console.error('Database update failed:', dbError);
        toast.error(`Database update failed: ${dbError.message || 'Unknown error'}`);
        // Refresh to ensure UI is in sync with database
        refreshData();
      }
      
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item: ' + error.message);
      
      // Refresh data to revert changes in UI
      refreshData();
    }
  }
  
  // Update the total amount in the grid
  function updateTotalAmount() {
    // Calculate new total
    const newTotal = gridSource
      .filter(item => !item.isTotal && !item.isSubItem)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // Update the total row
    const totalRow = gridSource.find(row => row.isTotal);
    if (totalRow) {
      totalRow.amount = newTotal;
    }
    
    // Update the result object
    if (result && result.estimate) {
      result.estimate.totalAmount = newTotal;
    }
  }

  function exportToExcel() {
    if (!gridSource || gridSource.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      // Prepare data for export - filter out any special rows or formatting
      const exportData = gridSource.map(row => {
        // Create a clean object for each row, excluding any special properties
        const cleanRow = {};
        
        // Add data from each column
        gridColumns.forEach(col => {
          if (col.prop && typeof row[col.prop] !== 'undefined') {
            cleanRow[col.name || col.prop] = row[col.prop];
          }
        });
        
        return cleanRow;
      });

      // Create a worksheet from the data
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Create a workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Estimate');
      
      // Generate filename based on estimate title
      const filename = `${result.estimate?.title || 'Project_Estimate'}.xlsx`;
      
      // Export the workbook
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export data. Please try again.');
    }
  }
</script>

<style>
  /* Fix for invisible text in editable cells */
  :global(.revogr-edit) {
    color: #000 !important;
    background-color: #fff !important;
    border: 1px solid #4299e1 !important;
    padding: 4px !important;
  }
  
  :global(.revogr-focus) {
    border: 1px solid #4299e1 !important;
  }
  
  :global(.revo-dropdown-list) {
    color: #000 !important;
    background-color: #fff !important;
    max-height: 200px !important;
    overflow-y: auto !important;
    z-index: 1000 !important;
  }
  
  /* Make grid container take up available vertical space */
  .grid-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: auto;
  }
  
  /* Responsive grid height */
  @media (max-width: 640px) {
    .grid-container {
      height: 500px;
      min-height: 300px;
      max-height: 70vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
    }
    
    /* Improve mobile grid behavior */
    :global(.grid-container > .revogr-holder) {
      overflow: visible !important;
      touch-action: manipulation; /* Improve touch handling */
    }
    
    /* Prevent focus loss on touch */
    :global(.revogr-focus) {
      outline: 2px solid #4299e1 !important;
      outline-offset: -2px;
      z-index: 5 !important;
    }
    
    /* Improve touch targets for better usability */
    :global(.revogr-cell) {
      min-height: 44px !important; /* Minimum touch target size */
    }
  }
  
  @media (min-width: 641px) {
    .grid-container {
      height: 700px; /* Fixed height to enable scrolling */
      min-height: 600px;
      max-height: 90vh; /* Limit maximum height */
      overflow-y: auto; /* Enable vertical scrolling */
      padding-bottom: 50px; /* Add some padding at the bottom */
    }
  }
  
  /* Ensure RevoGrid takes full height of its container */
  :global(.grid-container > .revogr-holder) {
    flex: 1;
    height: 100% !important;
    position: relative;
  }
  
  /* Fix horizontal scrollbar position */
  :global(.revogr-horizontal-scrollable) {
    position: sticky !important;
    bottom: 0 !important;
    z-index: 10 !important;
    background-color: white;
  }
  
  /* Mobile horizontal scrollbar adjustments */
  @media (max-width: 640px) {
    :global(.revogr-horizontal-scrollable) {
      position: relative !important;
      bottom: auto !important;
    }
  }
  
  :global(.revo-dropdown-list .selected) {
    background-color: #4299e1 !important;
    color: white !important;
  }
</style>

{#if gridSource.length > 0}
  <div class="bg-white rounded-md shadow mb-4 flex flex-col">
    <div class="p-3 sm:p-4 bg-slate-50 rounded-t-md border-b">
      <!-- Desktop layout -->
      <div class="hidden sm:flex flex-row justify-between gap-4">
        <div class="flex-1">
          <h4 class="font-medium">{result.estimate?.title || 'Project Estimate'}</h4>
          <p class="text-sm text-slate-500">Currency: {result.estimate?.currency || 'USD'}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold">{result.estimate?.totalAmount || 0} {result.estimate?.currency || 'USD'}</p>
        </div>
        <div class="flex flex-col gap-2 justify-end">
          <button 
            on:click={exportToExcel} 
            class="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center shadow-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span class="whitespace-nowrap">Export</span>
          </button>
          <button 
            on:click={toggleNewItemForm} 
            class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center shadow-sm transition-colors"
          >
            {#if !showNewItemForm}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            {/if}
            <span class="whitespace-nowrap">{showNewItemForm ? 'Cancel' : 'Add'}</span>
          </button>
        </div>
      </div>
      
      <!-- Mobile layout -->
      <div class="sm:hidden">
        <div class="flex justify-between items-center">
          <div>
            <h4 class="font-medium">{result.estimate?.title || 'Project Estimate'}</h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-slate-500">{result.estimate?.currency || 'USD'}</span>
              <span class="text-base font-semibold">{result.estimate?.totalAmount || 0}</span>
            </div>
          </div>
          <div class="flex gap-1">
            <button 
              on:click={exportToExcel} 
              class="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white p-1.5 rounded-md flex items-center justify-center shadow-sm"
              aria-label="Export as Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button 
              on:click={toggleNewItemForm} 
              class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white p-1.5 rounded-md flex items-center justify-center shadow-sm"
              aria-label="{showNewItemForm ? 'Cancel' : 'Add new item'}"
            >
              {#if !showNewItemForm}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              {/if}
            </button>
          </div>
        </div>
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
                <option value="unit">Unit</option>
                <option value="sq-ft">Square Foot</option>
                <option value="board-ft">Board Foot</option>
                <option value="package">Package</option>
                <option value="linear-ft">Linear Foot</option>
              </select>
            </div>
            <div>
              <label for="item-cost-type" class="block text-sm font-medium text-gray-700 mb-1">Cost Type</label>
              <select 
                id="item-cost-type"
                bind:value={newItem.costType} 
                class="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="material">Material</option>
                <option value="labor">Labor</option>
                <option value="equipment">Equipment</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="other">Other</option>
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
  <div class="grid-container flex-1 bg-white rounded-md overflow-hidden">
    <RevoGrid
      source={gridSource} 
      columns={gridColumns}
      theme="material"
      resize={true}
      on:aftercolumnresize={(e) => {
        saveColumnWidths(e.detail);
      }}
      on:afteredit={(e) => {
        handleCellEdit(e.detail);
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