<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
  import { createEventDispatcher } from 'svelte';
  import { toast } from "svelte-sonner";
  import { user } from '../../stores/authStore';
  import { getBusinessId } from '../../stores/userStore';
  import { supabase } from '$lib/supabase';

  export let isOpen = false;
  export const projectId = null;
  export const onClose = () => {};
  export const onColumnSaved = () => {};

  export let columnConfigurations = [];
  const dispatch = createEventDispatcher();

  let newColumnName = "";
  let newColumnType = "text";
  let newColumnKey = "";
  let editingColumn = null;
  let isLoading = false;
  let editMode = false;
  let businessId = null;
  
  const columnTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" }
  ];

  // Default columns that cannot be deleted
  const defaultColumns = [
    "description",
    "quantity",
    "unitPrice",
    "unit_type",
    "amount"
  ];

  $: if (isOpen) {
    resetForm();
    fetchBusinessIdAndLoadColumns();
    editMode = false;
  }
  
  $: {
    if (!isOpen && businessId) {
      dispatch('dialogClosed');
    }
  }
  
  async function fetchBusinessIdAndLoadColumns() {
    try {
      businessId = await getBusinessId();
      
      if (businessId) {
        await loadColumns();
      }
    } catch (error) {
      console.error('Error in fetchBusinessIdAndLoadColumns:', error);
    }
  }
  

  
  async function loadColumns() {
    if (!businessId) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('business_id', businessId);
      
      if (error) throw error;
      
      const customColumns = data || [];
      
      const defaultColumnsObjects = defaultColumns.map(key => ({
        column_key: key,
        display_name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        column_type: key === 'unitPrice' || key === 'quantity' || key === 'amount' ? 'number' : 'text',
        is_required: true,
        is_default: true
      }));
      
      const allColumns = [...defaultColumnsObjects, ...customColumns];
      
      columnConfigurations = allColumns;
      
      dispatch('columnsLoaded', allColumns);
    } catch (error) {
      console.error('Error loading columns:', error);
      toast.error('Failed to load columns');
    }
  }

  function resetForm() {
    newColumnName = "";
    newColumnType = "text";
    newColumnKey = "";
    editingColumn = null;
    editMode = false;
  }

  function generateColumnKey(name) {
    const baseKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = new Date().getTime();
    const uniqueKey = `${baseKey}_${timestamp}`;
    return uniqueKey;
  }

  function handleNameChange() {
    if (!editMode) {
      newColumnKey = generateColumnKey(newColumnName);
    }
  }

  function editColumn(column) {
    editMode = true;
    editingColumn = column;
    newColumnName = column.display_name;
    newColumnType = column.column_type;
    newColumnKey = column.column_key;
  }

  async function saveColumn() {
    toast.info('Processing column save request...');
    
    if (!newColumnName.trim()) {
      toast.error("Column name is required");
      return;
    }
    
    if (!businessId) {
      toast.error("Business information not available");
      return;
    }

    isLoading = true;

    try {
      let result;

      if (editMode && editingColumn) {
        const { data, error } = await supabase
          .from('custom_columns')
          .update({ display_name: newColumnName })
          .eq('business_id', businessId)
          .eq('column_key', editingColumn.column_key)
          .select();
        
        if (error) throw error;
        result = data[0];
        toast.success("Column renamed successfully");
      } else {
        if (!newColumnKey || newColumnKey.trim() === '') {
          newColumnKey = generateColumnKey(newColumnName);
        }
        
        const uiSettings = {
          width: 150,
          minSize: 80,
          maxSize: 300,
          sortable: true,
          filter: true,
          order: 999 
        };
        
        let columnOptions = null;
        
        const currentUser = $user;
        const userId = currentUser?.id;
        
        const { data, error } = await supabase
          .from('custom_columns')
          .insert({
            business_id: businessId,
            column_key: newColumnKey,
            display_name: newColumnName,
            column_type: newColumnType,
            is_required: false,
            default_value: null,
            options: columnOptions,
            ui_settings: uiSettings,
            created_by: userId
          })
          .select();
        
        
        result = data;
        
        toast.success("Column added successfully");
      }
      dispatch('columnSaved', result);
      resetForm();
      
      await loadColumns();
      
      closeDialog();
    } catch (error) {
      console.error('Error saving column:', error);
      toast.error(`Failed to save column: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  async function deleteColumn(column) {
    if (defaultColumns.includes(column.column_key)) {
      toast.error("Default columns cannot be deleted");
      return;
    }

    if (!confirm(`Are you sure you want to delete this column? This will remove the data from all items.`)) {
      return;
    }

    isLoading = true;

    try {
      const { deleteCustomColumn } = await import('../../stores/columnStore');
      const result = await deleteCustomColumn(businessId, column.column_key);
      
      if (result.success) {
        toast.success("Column deleted successfully and data cleaned up");
        dispatch('columnDeleted', { businessId, columnKey: column.column_key });
        await loadColumns();
      } else {
        throw new Error('Failed to delete column');
      }
    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error(`Failed to delete column: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  function closeDialog() {
    isOpen = false;
    dispatch('close');
    dispatch('dialogClosed');
  }
</script>

<Dialog bind:open={isOpen} on:close={closeDialog}>
  <DialogContent class="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Manage Columns</DialogTitle>
      <DialogDescription>
        Configure the columns displayed in your estimate table.
      </DialogDescription>
    </DialogHeader>

    <div class="py-4">
      <div class="space-y-4 mb-6">
        <h3 class="text-lg font-medium">{editMode ? 'Edit Column' : 'Add New Column'}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="column-name" class="block text-sm font-medium mb-1">Column Name</label>
            <Input 
              id="column-name" 
              type="text"
              bind:value={newColumnName} 
              on:input={handleNameChange}
              placeholder="Enter column name" 
              class="w-full"
            />
          </div>
          <div>
            <label for="column-type" class="block text-sm font-medium mb-1">Column Type</label>
            <select 
              id="column-type" 
              bind:value={newColumnType}
              class="w-full px-3 py-2 border rounded-md"
              disabled={editMode}
            >
              {#each columnTypes as type}
                <option value={type.value}>{type.label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="flex justify-end">
          {#if editMode}
            <Button variant="outline" class="mr-2" on:click={resetForm}>Cancel</Button>
          {/if}
          <button 
            type="button"
            on:click={() => {
              toast.info('Add Column button clicked!');
              saveColumn();
            }}
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
          >
            {#if isLoading}
              Saving...
            {:else}
              {editMode ? 'Update Column' : 'Add Column'}
            {/if}
          </button>
        </div>
      </div>

      <div class="border-t pt-4">
        <h3 class="text-lg font-medium mb-3">Current Columns</h3>
        <div class="overflow-y-auto max-h-[300px]">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 px-3">Column Name</th>
                <th class="text-left py-2 px-3">Type</th>
                <th class="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each columnConfigurations as column}
                <tr class="border-b hover:bg-slate-50">
                  <td class="py-2 px-3">
                    {column.display_name}
                    {#if defaultColumns.includes(column.column_key)}
                      <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">Default</span>
                    {/if}
                  </td>
                  <td class="py-2 px-3">
                    {columnTypes.find(t => t.value === column.column_type)?.label || column.column_type}
                  </td>
                  <td class="py-2 px-3 text-right">
                    {#if !defaultColumns.includes(column.column_key)}
                      <button 
                        class="text-blue-600 hover:text-blue-800 mr-2"
                        on:click={() => editColumn(column)}
                      >
                        Edit
                      </button>
                    {/if}
                    {#if !defaultColumns.includes(column.column_key)}
                      <button 
                        class="text-red-600 hover:text-red-800"
                        on:click={() => deleteColumn(column)}
                      >
                        Delete
                      </button>
                    {/if}
                  </td>
                </tr>
              {/each}
              {#if columnConfigurations.length === 0}
                <tr>
                  <td colspan="3" class="py-4 text-center text-gray-500">
                    No custom columns configured yet
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <DialogFooter>
      <!-- Use a native button instead of the Button component to ensure the click event works -->
      <button 
        type="button" 
        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors" 
        on:click={closeDialog}
        disabled={isLoading}
      >
        Cancel
      </button>
      <button 
        type="button" 
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors ml-2" 
        on:click={saveColumn}
        disabled={isLoading}
      >
        {#if isLoading}
          Saving...
        {:else}
          {editMode ? 'Update Column' : 'Add Column'}
        {/if}
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
