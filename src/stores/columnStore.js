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


    // Get custom columns from the custom_columns table
    const { data, error } = await supabase
      .from('custom_columns')
      .select('*')
      .eq('business_id', businessId);

    if (error) throw error;

    // Use the data directly, no need to parse
    const columns = data || [];

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

    // Set the column configurations
    columnConfigurations.set(combinedColumns);
    return combinedColumns;
  } catch (error) {
    console.error('Error loading column configurations:', error);
    columnConfigurations.set(DEFAULT_COLUMNS);
    return DEFAULT_COLUMNS;
  }
}

// Add a new custom column
export async function addCustomColumn(columnData) {
  try {
    const { data, error } = await supabase
      .from('custom_columns')
      .insert({
        business_id: columnData.business_id,
        column_key: columnData.column_key,
        display_name: columnData.display_name,
        column_type: columnData.column_type,
        is_required: columnData.is_required || false,
        default_value: columnData.default_value || null,
        options: columnData.options || null,
        ui_settings: columnData.ui_settings || {},
        created_by: columnData.created_by
      })
      .select();

    if (error) throw error;

    columnConfigurations.update(configs => {
      const newConfigs = [...configs, data];
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
    const { data, error } = await supabase
      .from('custom_columns')
      .update({ display_name: newDisplayName })
      .eq('business_id', businessId)
      .eq('column_key', columnKey)
      .select();

    if (error) throw error;

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
    const { data, error } = await supabase
      .from('custom_columns')
      .update({ ui_settings: uiSettings })
      .eq('business_id', businessId)
      .eq('column_key', columnKey)
      .select();

    if (error) throw error;

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

export async function deleteCustomColumn(businessId, columnKey) {

  try {
    const { error } = await supabase
      .from('custom_columns')
      .delete()
      .eq('business_id', businessId)
      .eq('column_key', columnKey);

    if (error) {
      console.error('Error deleting column from custom_columns:', error);
      throw error;
    }

    columnConfigurations.update(configs => {
      const filtered = configs.filter(c => !(c.business_id === businessId && c.column_key === columnKey));
      return filtered;
    });


    try {
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('remove_column_from_data', { column_key: columnKey });

      if (cleanupError) {
        console.error('Error calling remove_column_from_data RPC:', cleanupError);
        console.error('Error details:', JSON.stringify(cleanupError, null, 2));
      } else {
        console.log(`RPC function result:`, cleanupResult);
        console.log(`Successfully removed ${columnKey} from ${cleanupResult} items`);

        const { data: sampleItems, error: sampleError } = await supabase
          .from('estimate_items')
          .select('id, data')
          .limit(5);

        if (!sampleError && sampleItems) {
          console.log('Sample items after cleanup:', sampleItems.map(item => ({ id: item.id, data: item.data })));
        }
      }
    } catch (cleanupError) {
      console.error('Exception when cleaning up column data:', cleanupError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting custom column:', error);
    throw error;
  }
}

export function getGridColumns(configs, options = {}) {
  const { handleDeleteItem, handleCellEdit } = options;

  const gridColumns = configs.map(config => {
    const uiSettings = config.ui_settings || {};

    const column = {
      prop: config.column_key,
      name: config.display_name,
      size: uiSettings.width || uiSettings.size || 150,
      minSize: uiSettings.minSize || 80,
      maxSize: uiSettings.maxSize || 300,
      sortable: uiSettings.sortable !== false,
      filter: uiSettings.filter !== false,
      readonly: (props) => props.model.isTotal || props.model.isSubItem,
      editor: true
    };

    if (config.column_type === 'text') {
      column.columnType = 'string';
      // @ts-ignore - RevoGrid accepts string editor types
      column.editor = 'text';
    } else if (config.column_type === 'number') {
      column.columnType = 'numeric';
      // @ts-ignore - RevoGrid accepts string editor types
      column.editor = 'number';
    } else if (config.column_type === 'select' || config.column_type === 'multiselect') {
      let optionsArray = [];

      if (config.options) {
        try {
          if (typeof config.options === 'string') {
            optionsArray = JSON.parse(config.options);
          }
          else if (Array.isArray(config.options)) {
            optionsArray = config.options;
          }
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

      const formattedOptions = optionsArray.map(opt => {
        let label, value;

        if (typeof opt === 'string') {
          label = opt;
          value = opt;
        } else if (opt && typeof opt === 'object') {
          label = opt.label || opt.value || String(opt);
          value = opt.value !== undefined ? opt.value : opt.label || String(opt);
        } else {
          label = String(opt);
          value = opt;
        }

        return { label, value };
      });

      // @ts-ignore - RevoGrid accepts boolean for editor
      column.editor = true;

      column.cellTemplate = (h, props) => {
        const value = props.model[props.prop];
        console.log('Rendering dropdown cell for', props.prop, 'with value:', value);

        const option = formattedOptions.find(opt => String(opt.value) === String(value));
        const displayText = option ? option.label : (value || '');
        const handleClick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          const dropdown = document.createElement('select');
          dropdown.style.position = 'absolute';
          dropdown.style.zIndex = '1000';
          dropdown.style.width = '100%';
          dropdown.style.minWidth = '150px';
          dropdown.style.padding = '4px';
          dropdown.style.border = '1px solid #4299e1';
          dropdown.style.borderRadius = '4px';
          dropdown.style.backgroundColor = '#fff';
          dropdown.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

          // Add a blank option
          const blankOption = document.createElement('option');
          blankOption.value = '';
          blankOption.textContent = '-- Select an option --';
          dropdown.appendChild(blankOption);

          // Add all options
          formattedOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            dropdown.appendChild(option);
          });

          // Set current value
          dropdown.value = value || '';

          const rect = e.target.getBoundingClientRect();
          dropdown.style.left = rect.left + 'px';
          dropdown.style.top = (rect.bottom + 2) + 'px';

          dropdown.addEventListener('change', () => {
            const newValue = dropdown.value;
            const grid = document.querySelector('revo-grid');
            if (grid) {
              // @ts-ignore
              grid.setCellValue(props.rowIndex, props.prop, newValue);
            }

            document.body.removeChild(dropdown);
          });

          const handleOutsideClick = () => {
            if (document.body.contains(dropdown)) {
              document.body.removeChild(dropdown);
            }
            document.removeEventListener('click', handleOutsideClick);
          };

          document.body.appendChild(dropdown);
          dropdown.focus();

          setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
          }, 100);
        };

        return h('div', {
          class: 'dropdown-cell',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '0 8px',
            cursor: 'pointer'
          },
          onClick: handleClick
        }, [
          h('span', {}, displayText),
          h('span', {
            style: {
              color: '#666',
              fontSize: '10px'
            }
          }, '▼')
        ]);
      };

      // Add a custom cell template to show the dropdown value with an indicator
      column.cellTemplate = (h, props) => {
        const value = props.model[props.prop];

        // Use loose equality for comparison and convert both to strings for safer comparison
        const option = formattedOptions.find(opt => String(opt.value) == String(value));
        const displayText = option ? option.label : value;

        console.log('Display text for dropdown cell:', displayText);

        return h('div', {
          class: 'dropdown-cell',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '0 8px'
          }
        }, [
          // Text content
          h('span', {}, displayText || ''),
          // Dropdown indicator
          h('span', {
            style: {
              color: '#666',
              fontSize: '10px'
            }
          }, '▼')
        ]);
      };

    } else if (config.column_type === 'date') {
      // Get date format from UI settings or use default
      const dateFormat = config.ui_settings?.dateFormat || 'yyyy-MM-dd';
      const datePickerType = config.ui_settings?.datePickerType || 'date';

      console.log(`Setting up date editor for column ${config.column_key} with format ${dateFormat}`);

      // Use a custom date editor function
      // @ts-ignore - RevoGrid accepts function editors
      column.editor = true;
      column.cellTemplate = (h, props) => {
        // For display in the grid (not editing)
        return h('div', {
          class: 'date-cell',
          style: { padding: '0.25rem' }
        }, props.model[props.prop] || '');
      };

      // Define a custom editor when the cell is being edited
      column.editorComponent = {
        // This is used when the cell is being edited
        setup: (props) => {
          // Create a date picker input
          const input = document.createElement('input');
          input.type = datePickerType; // 'date' or 'datetime-local'
          input.className = 'revogr-edit w-full';
          input.value = props.model[props.prop] || '';

          // Handle value changes
          input.addEventListener('change', (event) => {
            // Type assertion to access value property
            const target = event.target;
            if (target instanceof HTMLInputElement) {
              props.onSave(target.value);
            }
          });

          return input;
        }
      };
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
