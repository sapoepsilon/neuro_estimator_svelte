import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

// Store for column configurations
export const columnConfigurations = writable([]);

// Default columns that are always present
export const DEFAULT_COLUMNS = [
  {
    column_key: 'description',
    display_name: 'Description',
    column_type: 'text',
    is_required: true,
    ui_settings: {
      size: 250,
      minSize: 200,
      maxSize: 500,
      sortable: true,
      filter: true
    }
  },
  {
    column_key: 'quantity',
    display_name: 'Quantity',
    column_type: 'number',
    is_required: true,
    ui_settings: {
      size: 100,
      minSize: 80,
      maxSize: 150,
      sortable: true,
      filter: true
    }
  },
  {
    column_key: 'unitPrice',
    display_name: 'Unit Price',
    column_type: 'number',
    is_required: true,
    ui_settings: {
      size: 120,
      minSize: 100,
      maxSize: 200,
      sortable: true,
      filter: true
    }
  },
  {
    column_key: 'amount',
    display_name: 'Amount',
    column_type: 'number',
    is_required: true,
    ui_settings: {
      size: 120,
      minSize: 100,
      maxSize: 200,
      sortable: true,
      filter: true
    }
  }
];

// Load column configurations for a business
export async function loadColumnConfigurations(projectId, userId) {
  try {
    if (!userId) return DEFAULT_COLUMNS;
    
    // First get the business_id for the user
    const { data: userData, error: userError } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', userId)
      .single();
    
    if (userError) {
      console.error('Error getting business ID:', userError);
      columnConfigurations.set(DEFAULT_COLUMNS);
      return DEFAULT_COLUMNS;
    }
    
    const businessId = userData?.business_id;
    if (!businessId) {
      columnConfigurations.set(DEFAULT_COLUMNS);
      return DEFAULT_COLUMNS;
    }
    
    console.log('Loading columns for business ID:', businessId);
    
    // Get custom columns using the RPC function
    const { data, error } = await supabase.rpc('get_business_columns', {
      p_business_id: businessId
    });
    
    console.log('Business columns response:', { data, error });
    
    if (error) throw error;
    
    // Parse the JSON result if it's a string
    const columns = typeof data === 'string' ? JSON.parse(data) : data || [];
    console.log('Parsed columns:', columns);
    
    // If we got an empty array or no data, use default columns
    if (!columns || columns.length === 0) {
      console.log('No custom columns found, using defaults');
      columnConfigurations.set(DEFAULT_COLUMNS);
      return DEFAULT_COLUMNS;
    }
    
    // Ensure default columns are included
    const defaultColumnKeys = DEFAULT_COLUMNS.map(col => col.column_key);
    const customColumns = columns.filter(col => !defaultColumnKeys.includes(col.column_key));
    
    // Combine default columns with custom columns
    const combinedColumns = [...DEFAULT_COLUMNS, ...customColumns];
    console.log('Combined columns (default + custom):', combinedColumns);
    
    // Set the column configurations
    columnConfigurations.set(combinedColumns);
    return combinedColumns;
  } catch (error) {
    console.error('Error loading column configurations:', error);
    // Fall back to default columns
    columnConfigurations.set(DEFAULT_COLUMNS);
    return DEFAULT_COLUMNS;
  }
}

// Add a new custom column
export async function addCustomColumn(columnData) {
  try {
    console.log('Adding custom column with data:', columnData);
    
    // Call the RPC function to add a custom column
    const { data, error } = await supabase.rpc('add_custom_column', {
      p_business_id: columnData.business_id,
      p_column_key: columnData.column_key,
      p_display_name: columnData.display_name,
      p_column_type: columnData.column_type,
      p_is_required: columnData.is_required || false,
      p_default_value: columnData.default_value || null,
      p_options: columnData.options || null,
      p_ui_settings: columnData.ui_settings || {}
    });
    
    console.log('RPC response:', { data, error });
    
    if (error) throw error;
    
    // Update store
    columnConfigurations.update(configs => {
      console.log('Current configs before update:', configs);
      // Add the new column to the list
      const newConfigs = [...configs, data];
      console.log('New configs after update:', newConfigs);
      return newConfigs;
    });
    
    return data;
  } catch (error) {
    console.error('Error adding custom column:', error);
    throw error;
  }
}

// Rename a custom column
export async function renameCustomColumn(businessId, columnKey, newDisplayName) {
  try {
    console.log('Renaming column with params:', { businessId, columnKey, newDisplayName });
    
    // Call the RPC function to rename a custom column
    const { data, error } = await supabase.rpc('rename_custom_column', {
      p_business_id: businessId,
      p_column_key: columnKey,
      p_new_display_name: newDisplayName
    });
    
    console.log('Rename column response:', { data, error });
    
    if (error) throw error;
    
    // Update store
    columnConfigurations.update(configs => {
      return configs.map(col => {
        if (col.business_id === businessId && col.column_key === columnKey) {
          return { ...col, display_name: newDisplayName };
        }
        return col;
      });
    });
    
    return data;
  } catch (error) {
    console.error('Error renaming custom column:', error);
    throw error;
  }
}

// Update column UI settings
export async function updateColumnUISettings(businessId, columnKey, uiSettings) {
  try {
    console.log('Updating column UI settings:', { businessId, columnKey, uiSettings });
    
    // Call the RPC function to update column UI settings
    const { data, error } = await supabase.rpc('update_column_ui_settings', {
      p_business_id: businessId,
      p_column_key: columnKey,
      p_ui_settings: uiSettings
    });
    
    console.log('Update UI settings response:', { data, error });
    
    if (error) throw error;
    
    // Update store
    columnConfigurations.update(configs => {
      return configs.map(col => {
        if (col.business_id === businessId && col.column_key === columnKey) {
          return { ...col, ui_settings: uiSettings };
        }
        return col;
      });
    });
    
    return data;
  } catch (error) {
    console.error('Error updating column UI settings:', error);
    throw error;
  }
}

// Delete a custom column
export async function deleteCustomColumn(businessId, columnKey) {
  try {
    console.log('Deleting column:', { businessId, columnKey });
    
    // Call the RPC function to delete a custom column
    const { data, error } = await supabase.rpc('delete_custom_column', {
      p_business_id: businessId,
      p_column_key: columnKey
    });
    
    console.log('Delete column response:', { data, error });
    
    if (error) throw error;
    
    // Update store
    columnConfigurations.update(configs => 
      configs.filter(c => !(c.business_id === businessId && c.column_key === columnKey))
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting custom column:', error);
    throw error;
  }
}

// Convert column configurations to RevoGrid column format
export function getGridColumns(configs, options = {}) {
  const { handleDeleteItem, handleCellEdit } = options;
  
  console.log('Creating grid columns from configs:', configs);
  
  // Map column configurations to grid columns
  const gridColumns = configs.map(config => {
    // Extract UI settings with fallbacks
    const uiSettings = config.ui_settings || {};
    
    // Base column properties
    const column = {
      prop: config.column_key,
      name: config.display_name,
      size: uiSettings.width || uiSettings.size || 150,
      minSize: uiSettings.minSize || 80,
      maxSize: uiSettings.maxSize || 300,
      sortable: uiSettings.sortable !== false,
      filter: uiSettings.filter !== false,
      readonly: (props) => props.model.isTotal || props.model.isSubItem,
      // Make sure all columns have an editor by default
      // Using any type to accommodate both boolean and string values
      editor: true
    };
    
    // Add type-specific properties
    if (config.column_type === 'number') {
      column.columnType = 'numeric';
      // @ts-ignore - RevoGrid accepts string editor types
      column.editor = 'number';
    } else if (config.column_type === 'select' || config.column_type === 'multiselect') {
      // @ts-ignore - RevoGrid accepts string editor types
      column.editor = 'select';
      // Parse options from the options field
      let optionsArray = [];
      
      if (config.options) {
        try {
          // If options is a string, try to parse it
          if (typeof config.options === 'string') {
            optionsArray = JSON.parse(config.options);
          } 
          // If options is already an array, use it directly
          else if (Array.isArray(config.options)) {
            optionsArray = config.options;
          }
          // If options is an object with values, convert it
          else if (typeof config.options === 'object') {
            optionsArray = Object.entries(config.options).map(([key, value]) => ({
              label: value,
              value: key
            }));
          }
        } catch (e) {
          console.error('Error parsing options:', e);
        }
      }
      
      column.editorSource = optionsArray.map(opt => ({
        label: opt.label || opt.value || opt,
        value: opt.value || opt
      }));
    } else if (config.column_type === 'date') {
      // @ts-ignore - RevoGrid accepts string editor types
      column.editor = 'date';
    } else if (config.column_type === 'boolean') {
      // @ts-ignore - RevoGrid accepts string editor types
      column.editor = 'select';
      column.editorSource = [
        { label: 'Yes', value: true },
        { label: 'No', value: false }
      ];
    } else {
      column.editor = true; // Default text editor
    }
    
    // Special handling for amount column or unit_price
    if (config.column_key === 'amount' || config.column_key === 'total_amount') {
      column.readonly = (props) => true; // Always readonly
    }
    
    return column;
  });
  
  console.log('Created grid columns:', gridColumns);
  
  // Add actions column
  if (handleDeleteItem) {
    gridColumns.push({
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
    });
  }
  
  return gridColumns;
}
