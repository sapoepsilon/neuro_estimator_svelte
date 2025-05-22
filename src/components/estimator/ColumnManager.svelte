<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { createEventDispatcher } from 'svelte';
  import { toast } from "svelte-sonner";
  import { writable } from "svelte/store";
  import { user } from '../../stores/authStore';
  import { getBusinessId } from '../../stores/userStore';
  import { supabase } from '$lib/supabase';
  import { testAddColumn } from '../../utils/testColumnCreation';

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
  
  // For dropdown options
  let dropdownOptions = "";
  let dropdownOptionsList = [];
  
  let dateFormat = "yyyy-MM-dd";
  let datePickerType = "date"; 

  // Column type options
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

  // Reset form when dialog opens/closes
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
      console.log('Fetched business ID:', businessId);
      
      if (businessId) {
        await loadColumns();
      }
    } catch (error) {
      console.error('Error in fetchBusinessIdAndLoadColumns:', error);
    }
  }
  
  // Test function to verify the custom_columns table
  async function testCustomColumnsTable() {
    try {
      if (!businessId) {
        businessId = await getBusinessId();
        if (!businessId) {
          toast.error('No business ID available');
          return;
        }
      }
      
      // First, check if the table exists by trying to get a single row
      const { data: tableCheck, error: tableCheckError } = await supabase
        .from('custom_columns')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        console.error('Error checking custom_columns table:', tableCheckError);
        toast.error(`Table check failed: ${tableCheckError.message}`);
        return;
      }
      
      toast.info('Testing column creation...');
      
      // Try to add a test column
      const result = await testAddColumn(businessId);
      
      if (result) {
        toast.success('Test column created successfully!');
        // Reload columns to show the new test column
        await loadColumns();
      } else {
        toast.error('Failed to create test column');
      }
    } catch (error) {
      console.error('Error in testCustomColumnsTable:', error);
      toast.error(`Test failed: ${error.message}`);
    }
  }
  
  // Load columns for the business
  async function loadColumns() {
    if (!businessId) return;
    
    try {
      
      // Get custom columns directly from the table
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('business_id', businessId);
      
      if (error) throw error;
      
      // Use the data directly
      const columns = data || [];
      console.log('Loaded columns:', columns);
      
      // Update the column configurations by dispatching an event
      dispatch('columnsLoaded', columns);
    } catch (error) {
      console.error('Error loading columns:', error);
      toast.error('Failed to load columns');
    }
  }

  function resetForm() {
    console.log('Resetting form');
    newColumnName = "";
    newColumnType = "text";
    newColumnKey = "";
    editingColumn = null;
    editMode = false;
    
    // Reset dropdown options
    dropdownOptions = "";
    dropdownOptionsList = [];
    
    // Reset date format
    dateFormat = "yyyy-MM-dd";
    datePickerType = "date";
    
    console.log('Form reset, editMode is now:', editMode);
  }

  function generateColumnKey(name) {
    // Generate a unique key based on name and timestamp
    const baseKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = new Date().getTime();
    const uniqueKey = `${baseKey}_${timestamp}`;
    console.log('Generated unique column key:', uniqueKey);
    return uniqueKey;
  }

  function handleNameChange() {
    if (!editMode) {
      newColumnKey = generateColumnKey(newColumnName);
      console.log('Column key updated to:', newColumnKey);
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
    console.log('saveColumn function called with:', { 
      newColumnName, 
      newColumnType, 
      newColumnKey, 
      businessId, 
      editMode, 
      editingColumn 
    });
    
    // Add a visible notification instead of an alert
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
        console.log('Renaming column:', editingColumn);
        // Update existing column (rename) using direct table operation
        const { data, error } = await supabase
          .from('custom_columns')
          .update({ display_name: newColumnName })
          .eq('business_id', businessId)
          .eq('column_key', editingColumn.column_key)
          .select();
        
        if (error) throw error;
        result = data[0];
        console.log('Column renamed result:', result);
        toast.success("Column renamed successfully");
      } else {
        // Make sure we have a valid column key
        if (!newColumnKey || newColumnKey.trim() === '') {
          newColumnKey = generateColumnKey(newColumnName);
          console.log('Generated new column key:', newColumnKey);
        }
        
        console.log('Adding new column with name:', newColumnName, 'key:', newColumnKey, 'type:', newColumnType);
        
        // Create UI settings object
        const uiSettings = {
          width: 150,
          minSize: 80,
          maxSize: 300,
          sortable: true,
          filter: true,
          
          // Add column type specific settings
          ...(newColumnType === 'date' && {
            dateFormat: dateFormat,
            datePickerType: datePickerType
          }),
          order: 999 // High number to put it at the end
        };
        
        // Prepare options for dropdown if applicable
        let columnOptions = null;
        if (newColumnType === 'select') {
          if (dropdownOptionsList.length > 0) {
            // Convert options to the format expected by the database
            // Use a slugified version of the option as the value to ensure it's safe for storage
            columnOptions = dropdownOptionsList.map((option, index) => {
              // Create a value that's guaranteed to be unique and valid
              const value = option.toLowerCase().replace(/[^a-z0-9]/g, '_') || `option_${index+1}`;
              return {
                label: option,
                value: value
              };
            });
            console.log('Saving dropdown options:', columnOptions);
          } else {
            // Show warning if no options were provided
            toast.warning('No dropdown options provided. Adding default options.');
            // Provide some default options
            columnOptions = [
              { label: 'Option 1', value: 'option_1' },
              { label: 'Option 2', value: 'option_2' },
              { label: 'Option 3', value: 'option_3' }
            ];
          }
        }
        
        console.log('Inserting new column with parameters:', {
          business_id: businessId,
          column_key: newColumnKey,
          display_name: newColumnName,
          column_type: newColumnType,
          options: columnOptions
        });
        
        // Get current user from store
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
        
        console.log('RPC call completed, response:', { data, error });
        
        // Set result to the response data
        result = data;
        
        console.log('Column added result:', result);
        toast.success("Column added successfully");
      }

      // Update local data
      console.log('Dispatching columnSaved event with result:', result);
      dispatch('columnSaved', result);
      resetForm();
      
      // Reload column configurations
      await loadColumns();
      
      // Close the dialog to trigger a refresh in the parent component
      closeDialog();
    } catch (error) {
      console.error('Error saving column:', error);
      toast.error(`Failed to save column: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  async function deleteColumn(column) {
    // Don't allow deletion of default columns
    if (defaultColumns.includes(column.column_key)) {
      toast.error("Default columns cannot be deleted");
      return;
    }

    if (!confirm(`Are you sure you want to delete this column? This will remove the data from all items.`)) {
      return;
    }

    isLoading = true;

    try {
      // Delete the custom column using direct table operation
      const { data, error } = await supabase
        .from('custom_columns')
        .delete()
        .eq('business_id', businessId)
        .eq('column_key', column.column_key);
      
      if (error) throw error;
      
      toast.success("Column deleted successfully");
      dispatch('columnDeleted', { businessId, columnKey: column.column_key });
      
      // Reload column configurations
      await loadColumns();
    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error(`Failed to delete column: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  function closeDialog() {
    console.log('closeDialog function called');
    // Set isOpen to false to close the dialog
    isOpen = false;
    // Also dispatch the close event for any parent components
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
        
        <!-- Dropdown options configuration (only shown for select type) -->
        {#if newColumnType === 'select'}
          <div class="mt-4">
            <label for="dropdown-options" class="block text-sm font-medium mb-1">Dropdown Options</label>
            <div class="text-xs text-gray-500 mb-2">Enter one option per line or comma-separated values</div>
            <Textarea
              id="dropdown-options"
              bind:value={dropdownOptions}
              placeholder="Option 1\nOption 2\nOption 3"
              class="w-full h-24"
              on:input={() => {
                // Parse options from textarea
                if (dropdownOptions.includes('\n')) {
                  // Split by newline
                  dropdownOptionsList = dropdownOptions.split('\n')
                    .map(opt => opt.trim())
                    .filter(opt => opt.length > 0);
                } else {
                  // Split by comma
                  dropdownOptionsList = dropdownOptions.split(',')
                    .map(opt => opt.trim())
                    .filter(opt => opt.length > 0);
                }
              }}
            />
            
            <!-- Preview of parsed options -->
            {#if dropdownOptionsList.length > 0}
              <div class="mt-2">
                <div class="text-sm font-medium mb-1">Preview:</div>
                <div class="flex flex-wrap gap-2">
                  {#each dropdownOptionsList as option}
                    <div class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{option}</div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Date field configuration -->
        {#if newColumnType === 'date'}
          <div class="mt-4">
            <label for="date-format" class="block text-sm font-medium mb-1">Date Format</label>
            <select 
              id="date-format" 
              bind:value={dateFormat}
              class="w-full px-3 py-2 border rounded-md mb-2"
            >
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="yyyy-MM-dd HH:mm">YYYY-MM-DD HH:MM</option>
            </select>
            
            <label for="date-picker-type" class="block text-sm font-medium mb-1">Date Picker Type</label>
            <select 
              id="date-picker-type" 
              bind:value={datePickerType}
              class="w-full px-3 py-2 border rounded-md"
            >
              <option value="date">Date Only</option>
              <option value="datetime-local">Date and Time</option>
            </select>
          </div>
        {/if}
        <div class="flex justify-end">
          <!-- Always show the Cancel button when in edit mode -->
          {#if editMode}
            <Button variant="outline" class="mr-2" on:click={() => { console.log('reset form!'); resetForm(); }}>Cancel</Button>
          {/if}
          
          <!-- Simple button with minimal code for debugging -->
          <button 
            type="button"
            on:click={() => {
              console.log('ADD COLUMN BUTTON CLICKED!');
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
                    <button 
                      class="text-blue-600 hover:text-blue-800 mr-2"
                      on:click={() => editColumn(column)}
                    >
                      Edit
                    </button>
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
      <!-- Test button to verify the custom_columns table -->
      <button 
        type="button" 
        class="btn bg-purple-600 hover:bg-purple-700 text-white" 
        on:click={testCustomColumnsTable}
        disabled={isLoading}
      >
        Test DB Table
      </button>
      
      <!-- Use a native button instead of the Button component to ensure the click event works -->
      <button 
        type="button" 
        class="btn bg-gray-200 hover:bg-gray-300 text-gray-800 ml-2" 
        on:click={closeDialog}
        disabled={isLoading}
      >
        Cancel
      </button>
      <button 
        type="button" 
        class="btn bg-blue-600 hover:bg-blue-700 text-white ml-2" 
        on:click={saveColumn}
        disabled={isLoading}
      >
        {editMode ? 'Update' : 'Add'} Column
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
