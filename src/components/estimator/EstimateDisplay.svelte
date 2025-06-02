<script lang="ts">
  import { RevoGrid } from '@revolist/svelte-datagrid';
  import { onMount, setContext } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { user } from '../../stores/authStore';
  import { gridData, currentProjectId } from '../../stores/gridStore';
  import { selectedRange as selectedRangeStore } from '../../stores/rangeSelectionStore';
  import { toast } from "svelte-sonner";
  import { exportToExcel } from '$lib/utils';
  import '$lib/styles/revogrid.css';

  export let result: any = null;
  export let projectId: string | null = null;
  let gridSource: any[] = [];
  let gridColumns: any[] = [];
  let showNewItemForm = false;
  let showColumnDialog = false;
  let columnDialogMode = 'add'; // 'add' or 'edit'
  let editingColumn = null;
  let gridContainer = null;
  let revoGridInstance = null;
  let currentSelection = null;
  let rangeReference = null;
  let newColumn = {
    column_name: '',
    data_type: 'text',
    is_required: false,
    position: 0
  };
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
  setContext('getGridData', () => {
    return { gridSource, gridColumns };
  });
  
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
    readonly?: boolean | ((props: any) => boolean);
  };
  
  type ColumnResizeDetail = {
    [index: number]: ColumnRegular;
  };

  type EstimateItem = {
    id: number;
    project_id: number;
    row_number: number;
    column_id: number;
    value: string;
    created_at: string;
    updated_at: string;
  };

  type ColumnDefinition = {
    id: number;
    project_id: number;
    column_name: string;
    data_type: string;
    is_required: boolean;
    position: number;
    created_at: string;
  };

  type LineItem = {
    id: number | null;
    row_number: number;
    subItems: any[];
    [key: string]: any;
  };
  
  onMount(() => {
    loadColumnWidths();
    if (projectId && !result) {
      loadProjectData(projectId);
    }
    
    if (typeof window !== 'undefined') {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      
      if (isMobile) {
        setTimeout(() => {
          const gridContainer = document.querySelector('.grid-container');
          if (gridContainer) {
            // Less aggressive touch handling - only prevent conflicts during editing
            gridContainer.addEventListener('touchstart', (e) => {
              const target = e.target as HTMLElement;
              if (target && target.closest && target.closest('.revogr-edit')) {
                e.stopPropagation();
              }
            }, { passive: true });
            
            // Simplified touch end for cell selection
            gridContainer.addEventListener('touchend', (e) => {
              const target = e.target as HTMLElement;
              if (target && target.closest) {
                const cell = target.closest('.revogr-cell') as HTMLElement;
                if (cell && !target.closest('.revogr-edit')) {
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
  
  let previousProjectId: string | null = null;
  
  $: if (projectId && projectId !== previousProjectId) {
    console.log('ProjectId changed from', previousProjectId, 'to', projectId);
    previousProjectId = projectId;
    loadProjectData(projectId);
  }
  
  async function loadProjectData(id: string) {
    if (!id) return;
    
    try {
      console.log('Loading project data for ID:', id);
      
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (projectError) throw projectError;
      console.log('Project data loaded:', projectData);
     
      const {data: projectColumns, error: columnsError} = await supabase
        .from('estimate_columns')
        .select('*')
        .eq('project_id', id)
        .order('position', { ascending: true });
      
      if (columnsError) throw columnsError;
      
      // Fetch estimate items with row_number and column_id
      const { data: estimateItems, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('project_id', id)
        .order('row_number', { ascending: true })
        .order('column_id', { ascending: true });
     
      
      if (itemsError) throw itemsError; 

      const itemsByRow: Record<number, EstimateItem[]> = estimateItems.reduce<Record<number, EstimateItem[]>>((acc, item) => {
        if (!acc[item.row_number]) {
          acc[item.row_number] = [];
        }
        acc[item.row_number].push(item);
        return acc;
      }, {});

      const lineItems: LineItem[] = Object.entries(itemsByRow).map(([rowNumber, rowItems]) => {
        const rowData: LineItem = {
          id: null,
          row_number: parseInt(rowNumber),
          subItems: [],
          amount: 0
        };

        rowItems.forEach((item: EstimateItem) => {
          const column = projectColumns.find((col: ColumnDefinition) => col.id === item.column_id);
          if (column) {
            if (['quantity', 'unit_price', 'amount'].includes(column.column_name)) {
              rowData[column.column_name] = parseFloat(item.value) || 0;
            } else {
              rowData[column.column_name] = item.value;
            }
            
            if (!rowData.id) {
              rowData.id = item.id;
            }
          }
        });

        return rowData;
      });

      const formattedResult = {
        estimate: {
          title: projectData.name,
          description: projectData.description,
          currency: 'USD',
          projectColumns: projectColumns,
          lineItems: lineItems,
          totalAmount: lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        }
      };
      
      result = formattedResult;
      prepareGridData(formattedResult);
    } catch (error) {
      console.error('Error loading project data:', error);
      toast.error('Error loading project data: ' + error.message);
    }
  }
  
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

    const projectColumns = (data.estimate.projectColumns || []).filter(
      column => !['parent_item_id', 'data', 'currency'].includes(column.column_name)
    );
    
    const dynamicColumns: ColumnRegular[] = projectColumns.map(column => {
      const displayName = column.column_name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const currentColumnName = column.column_name;
      const currentColumn = column;
      
      const baseColumn: ColumnRegular = {
        prop: column.column_name,
        name: displayName,
        size: column.size || 150,
        minSize: 80,
        maxSize: 300,
        sortable: true,
        filter: true,
        readonly: (props) => props.model.isTotal || props.model.isSubItem || column.is_readonly,
        columnTemplate: (h, props) => {
          return h('div', {
            'data-column-name': currentColumnName,
            'key': `column-header-${currentColumnName}`,
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '4px 8px',
              userSelect: 'none',
              position: 'relative'
            }
          }, [
            h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: '1'
              }
            }, [
              h('span', {
                style: {
                  fontWeight: '500'
                }
              }, displayName)
            ]),
            h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }
            }, [
              h('button', {
                style: {
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--neutral-400)',
                  fontSize: '12px',
                  width: '20px',
                  height: '20px'
                },
                onClick: (e) => {
                  e.stopPropagation();
                  handleEditColumn(currentColumn);
                },
                onMouseEnter: (e) => {
                  e.target.style.backgroundColor = 'var(--neutral-50)';
                  e.target.style.color = 'var(--neutral-600)';
                },
                onMouseLeave: (e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--neutral-400)';
                },
                title: 'Edit column'
              }, '⚙'),
              h('button', {
                style: {
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--neutral-400)',
                  fontSize: '12px',
                  width: '20px',
                  height: '20px'
                },
                onClick: (e) => {
                  e.stopPropagation();
                  handleDeleteColumn(currentColumn);
                },
                onMouseEnter: (e) => {
                  e.target.style.backgroundColor = 'var(--accent-light)';
                  e.target.style.color = 'var(--action-danger)';
                },
                onMouseLeave: (e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--neutral-400)';
                },
                title: 'Delete column'
              }, '×')
            ])
          ]);
        }
      };

      switch (column.data_type) {
        case 'number':
        case 'integer':
        case 'float':
          return {
            ...baseColumn,
            columnType: 'numeric',
            size: 120,
            minSize: 80,
            maxSize: 150
          };
        
        case 'select':
        case 'dropdown':
          return {
            ...baseColumn,
            size: 150
          };
        
        case 'boolean':
          return {
            ...baseColumn,
            size: 100
          };
        
        case 'date':
          return {
            ...baseColumn,
            columnType: 'date',
            size: 120
          };
        
        case 'text':
        default:
          return {
            ...baseColumn,
            size: column.column_name === 'description' ? 250 : 150
          };
      }
    });

    const actionsColumn: ColumnRegular = {
      prop: 'actions',
      name: 'Actions',
      size: 100,
      minSize: 80,
      maxSize: 120,
      cellTemplate: (h, props) => {
        if (props.model.isTotal) {
          return h('div', {});
        }
        return h(
          'button',
          {
            style: {
              background: 'none',
              border: 'none',
              color: 'var(--action-danger)',
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
    };
    // Combine dynamic columns with the actions column
    const defaultColumns = [...dynamicColumns, actionsColumn];
    gridColumns = applySavedColumnWidths(defaultColumns);
    const flattenedItems = [];
    const columnNames = (data.estimate.projectColumns || []).map(col => col.column_name);
    data.estimate.lineItems.forEach((item, index) => {
      const rowItem = { 
        id: item.id,
        isHeader: true,
        ...item 
      };
      
      columnNames.forEach(colName => {
        if (rowItem[colName] === undefined) {
          rowItem[colName] = null;
        }
      });
      
      flattenedItems.push(rowItem);
      
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem, subIndex) => {
          const subRowItem = {
            id: `item-${index}-sub-${subIndex}`,
            ...subItem,
            isSubItem: true
          };
          
          if (subItem.description !== undefined) {
            subRowItem.description = `    ${subItem.description}`;
          }
          
          flattenedItems.push(subRowItem);
        });
      }
    });
    
    const totalRow = {
      id: 'total',
      description: 'Total',
      amount: data.estimate.totalAmount,
      isTotal: true
    };
    
    columnNames.forEach(colName => {
      if (colName !== 'description' && colName !== 'amount') {
        totalRow[colName] = '';
      }
    });
    
    flattenedItems.push(totalRow);
    gridSource = flattenedItems;
  }
  
  function saveColumnWidths(columnDetails: {[index: number]: {prop: string, size: number}}) {
    try {
      const widthsToSave: {[prop: string]: number} = {};
      Object.entries(columnDetails).forEach(([index, column]) => {
        widthsToSave[column.prop] = column.size;
      });
      const existingWidths = JSON.parse(localStorage.getItem(COLUMN_WIDTHS_KEY) || '{}');
      const updatedWidths = { ...existingWidths, ...widthsToSave };
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(updatedWidths));
    } catch (error) {
      console.error('Error saving column widths to local storage:', error);
    }
  }
  
  function loadColumnWidths() {
    try {
      return JSON.parse(localStorage.getItem(COLUMN_WIDTHS_KEY) || '{}');
    } catch (error) {
      console.error('Error loading column widths from local storage:', error);
      return {};
    }
  }
  
  function applySavedColumnWidths(defaultColumns: ColumnRegular[]) {
    const savedWidths = loadColumnWidths();
    return defaultColumns.map(column => {
      if (savedWidths[column.prop]) {
        return { ...column, size: savedWidths[column.prop] };
      }
      return column;
    });
  }
  
  function calculateAmount() {
    newItem.amount = newItem.quantity * newItem.unitPrice;
    newItem.amount = parseFloat(newItem.amount.toFixed(2));
  }
  
  async function addNewItem() {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    calculateAmount();
    
    try {
      const currentProjectId = result?.estimate?.project?.id || projectId;
      if (!currentProjectId) {
        alert('Project ID not found');
        return;
      }
      
      const projectColumns = result?.estimate?.projectColumns || [];
      
      const existingItems = result?.estimate?.lineItems || [];
      const maxRowNumber = existingItems.reduce((max, item) => {
        return Math.max(max, item.row_number || 0);
      }, 0);
      const newRowNumber = maxRowNumber + 1;
      
      const insertPromises = [];
      
      const fieldMappings = {
        'description': newItem.description,
        'title': newItem.description, // Support both column names
        'quantity': newItem.quantity.toString(),
        'unit_type': newItem.unitType,
        'unit_price': newItem.unitPrice.toString(),
        'amount': newItem.amount.toString(),
        'cost_type': newItem.costType,
        'currency': result.estimate?.currency || 'USD',
        'status': 'draft'
      };
      
      // Insert a value for each column that has data
      for (const [columnName, value] of Object.entries(fieldMappings)) {
        const column = projectColumns.find(col => col.column_name === columnName);
        if (column && value) {
          insertPromises.push(
            supabase
              .from('estimate_items')
              .insert({
                project_id: currentProjectId,
                row_number: newRowNumber,
                column_id: column.id,
                value: value
              })
          );
        }
      }
      
      // Execute all inserts
      const results = await Promise.all(insertPromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
      
      dispatch('itemAdded');
      toast.success('Item added successfully');
      
      const lastUnitType = newItem.unitType;
      const lastCostType = newItem.costType;
      newItem = {
        description: '',
        quantity: 1,
        unitType: lastUnitType,
        costType: lastCostType,
        unitPrice: 0,
        amount: 0
      };
      showNewItemForm = false;
      
    } catch (error) {
      console.error('Error adding new item:', error);
      toast.error('Failed to add new item. Please try again.');
    }
  }
  
  function toggleNewItemForm() {
    showNewItemForm = !showNewItemForm;
    
    if (showNewItemForm) {
      calculateAmount();
    }
  }
  
  async function handleDeleteItem(item) {
    if (!item || !item.row_number) {
      console.error('No row_number found for deletion');
      return;
    }
    
    const currentProjectId = result?.estimate?.project?.id || projectId;
    if (!currentProjectId) {
      console.error('No project ID found');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${item.description || 'this item'}?`)) {
      try {
        // Delete all cells for this row_number in the EAV structure
        const { error } = await supabase
          .from('estimate_items')
          .delete()
          .eq('project_id', currentProjectId)
          .eq('row_number', item.row_number);
        
        if (error) throw error;
        
        dispatch('itemDeleted');
        toast.success('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item. Please try again.');
      }
    }
  }

  async function handleCellEdit(editEvent) {
    try {
      console.log(`handleCellEdit: ${JSON.stringify(editEvent)}`);
      
      const { prop, model, val, value: oldVal, rowIndex } = editEvent;
      
      console.log('Cell edit event processed:', { prop, model, val, oldVal, rowIndex });
      
      if (val === oldVal || model?.isTotal) return;
      
      const rowData = model;
      console.log('Row data from model:', rowData);
      
      if (!rowData || rowData.isTotal) return;
      
      // Get row_number from the model
      const rowNumber = rowData.row_number;
      if (!rowNumber) {
        console.error('No row_number found in row data');
        toast.error('Could not update: No row number found');
        return;
      }
      
      // Get column definition
      const projectColumns = result?.estimate?.projectColumns || [];
      const column = projectColumns.find(col => col.column_name === prop);
      
      if (!column) {
        console.error('Column not found:', prop);
        toast.error(`Column ${prop} not found`);
        return;
      }
      
      const currentProjectId = result?.estimate?.project?.id || projectId;
      let processedValue = val;
      
      // Handle amount calculation for quantity or unit_price changes
      if (prop === 'quantity' || prop === 'unit_price') {
        const quantity = prop === 'quantity' ? parseFloat(processedValue) : parseFloat(rowData.quantity || 0);
        const unitPrice = prop === 'unit_price' ? parseFloat(processedValue) : parseFloat(rowData.unit_price || 0);
        const newAmount = quantity * unitPrice;
        
        // Update the amount in the grid data
        rowData.amount = newAmount;
        
        if (editEvent.data && Array.isArray(editEvent.data)) {
          const dataIndex = editEvent.data.findIndex(item => item.row_number === rowNumber);
          if (dataIndex >= 0) {
            editEvent.data[dataIndex].amount = newAmount;
            gridSource = [...editEvent.data];
          }
        }
        
        // Find the amount column
        const amountColumn = projectColumns.find(col => col.column_name === 'amount');
        if (amountColumn) {
          // Update amount in database
          const { error: amountError } = await supabase
            .from('estimate_items')
            .upsert({
              project_id: currentProjectId,
              row_number: rowNumber,
              column_id: amountColumn.id,
              value: newAmount.toString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'project_id,row_number,column_id'
            });
          
          if (amountError) {
            console.error('Error updating amount:', amountError);
          }
        }
        
        updateTotalAmount();
      }
      
      console.log('Updating value in EAV structure:', { 
        projectId: currentProjectId, 
        rowNumber, 
        columnId: column.id, 
        value: processedValue 
      });
      
      try {
        // Update the specific cell value in the EAV structure
        const { data, error } = await supabase
          .from('estimate_items')
          .upsert({
            project_id: projectId,
            row_number: rowNumber,
            column_id: column.id,
            value: processedValue.toString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'project_id,row_number,column_id'
          })
          .select();
        
        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        
        console.log('Database update successful:', data);
        toast.success('Item updated successfully');
        
        setTimeout(() => {
          refreshData();
        }, 100);
        
      } catch (dbError) {
        console.error('Database update failed:', dbError);
        toast.error(`Database update failed: ${dbError.message || 'Unknown error'}`);
        refreshData();
      }
      
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item: ' + (error.message || 'Unknown error'));
      refreshData();
    }
  }
  
  function updateTotalAmount() {
    const newTotal = gridSource
      .filter(item => !item.isTotal && !item.isSubItem)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    const totalRow = gridSource.find(row => row.isTotal);
    if (totalRow) {
      totalRow.amount = newTotal;
    }
    
    if (result && result.estimate) {
      result.estimate.totalAmount = newTotal;
    }
  }
  
  // Column management functions
  function handleAddColumn() {
    columnDialogMode = 'add';
    editingColumn = null;
    newColumn = {
      column_name: '',
      data_type: 'text',
      is_required: false,
      position: 0
    };
    showColumnDialog = true;
  }
  
  function handleEditColumn(column) {
    columnDialogMode = 'edit';
    editingColumn = column;
    newColumn = {
      column_name: column.column_name,
      data_type: column.data_type,
      is_required: column.is_required,
      position: column.position
    };
    showColumnDialog = true;
  }
  
  async function handleDeleteColumn(column) {
    if (!column || !projectId) return;
    
    if (confirm(`Are you sure you want to delete the "${column.column_name}" column? This will delete all data in this column.`)) {
      try {
        // First delete all estimate_items for this column
        const { error: itemsError } = await supabase
          .from('estimate_items')
          .delete()
          .eq('project_id', projectId)
          .eq('column_id', column.id);
        
        if (itemsError) throw itemsError;
        
        // Then delete the column definition
        const { error: columnError } = await supabase
          .from('estimate_columns')
          .delete()
          .eq('id', column.id);
        
        if (columnError) throw columnError;
        
        toast.success('Column deleted successfully');
        refreshData();
      } catch (error) {
        console.error('Error deleting column:', error);
        toast.error('Failed to delete column: ' + error.message);
      }
    }
  }
  
  async function saveColumn() {
    if (!newColumn.column_name.trim() || !projectId) {
      toast.error('Column name is required');
      return;
    }
    
    try {
      const projectColumns = result?.estimate?.projectColumns || [];
      const maxPosition = Math.max(...projectColumns.map(col => col.position || 0), 0);
      
      if (columnDialogMode === 'add') {
        // Check if column name already exists
        const existingColumn = projectColumns.find(col => 
          col.column_name.toLowerCase() === newColumn.column_name.toLowerCase()
        );
        
        if (existingColumn) {
          toast.error('Column name already exists');
          return;
        }
        
        // Insert new column
        const { error } = await supabase
          .from('estimate_columns')
          .insert({
            project_id: projectId,
            column_name: newColumn.column_name.toLowerCase().replace(/\s+/g, '_'),
            data_type: newColumn.data_type,
            is_required: newColumn.is_required,
            position: maxPosition + 1
          });
        
        if (error) throw error;
        toast.success('Column added successfully');
      } else if (columnDialogMode === 'edit' && editingColumn) {
        // Update existing column
        const { error } = await supabase
          .from('estimate_columns')
          .update({
            column_name: newColumn.column_name.toLowerCase().replace(/\s+/g, '_'),
            data_type: newColumn.data_type,
            is_required: newColumn.is_required
          })
          .eq('id', editingColumn.id);
        
        if (error) throw error;
        toast.success('Column updated successfully');
      }
      
      showColumnDialog = false;
      refreshData();
    } catch (error) {
      console.error('Error saving column:', error);
      toast.error('Failed to save column: ' + error.message);
    }
  }
  
  async function handleMouseUp() {
    setTimeout(async () => {
      if (revoGridInstance) {
        try {
          const selection = await revoGridInstance.getSelectedRange();
          if (selection && typeof selection.y === 'number' && typeof selection.y1 === 'number') {
            const startRow = selection.y + 1;
            const endRow = selection.y1 + 1;
            const rangeRef = startRow === endRow ? `@${startRow}` : `@${startRow}-${endRow}`;
            currentSelection = selection;
            rangeReference = rangeRef;
          } else {
            currentSelection = null;
            rangeReference = null;
          }
        } catch (error) {
          console.error('Error getting selected range:', error);
          currentSelection = null;
          rangeReference = null;
        }
      } else {
        console.log('revoGridInstance is null');
      }
    }, 100);
  }
  
  function sendRangeToAI() {
    if (rangeReference) {
      selectedRangeStore.set(rangeReference);
      window.dispatchEvent(new CustomEvent('openAiSidebar', {
        detail: { 
          projectId: projectId,
          projectName: result?.estimate?.title || 'Project'
        }
      }));
      currentSelection = null;
      rangeReference = null;
    }
  }
  
</script>


{#if gridSource.length > 0}
  <div class="flex flex-col">
    <div class="rounded-md shadow mb-4 flex flex-col flex-shrink-0">
    <div class="p-3 sm:p-4 bg-slate-50 rounded-t-md border-b">
      <!-- Desktop layout - Optimized for better space utilization -->
      <div class="hidden sm:flex items-center justify-between gap-4 w-full">
        <div class="flex items-center gap-4 flex-grow">
          <div>
            <h4 class="font-medium">{result.estimate?.title || 'Project Estimate'}</h4>
            <p class="text-sm text-slate-500">Currency: {result.estimate?.currency || 'USD'}</p>
          </div>
          <div class="ml-auto flex items-center">
            <p class="text-lg font-semibold">{result.estimate?.totalAmount || 0} {result.estimate?.currency || 'USD'}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          {#if rangeReference}
            <button 
              on:click={sendRangeToAI}
              class="bg-action-primary hover:bg-accent-hover active:bg-accent-hover text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center shadow-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span class="whitespace-nowrap">Send {rangeReference} to AI</span>
            </button>
          {/if}
          <button 
            on:click={() => exportToExcel(
        gridSource,
        gridColumns,
        result.estimate?.title
      )} 
            class="bg-action-success hover:bg-green-600 active:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center shadow-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span class="whitespace-nowrap">Export</span>
          </button>
          <button 
            on:click={handleAddColumn} 
            class="bg-action-secondary hover:bg-neutral-600 active:bg-neutral-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center shadow-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V9l-6-5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v5h5" />
            </svg>
            <span class="whitespace-nowrap">Add Column</span>
          </button>
          <button 
            on:click={toggleNewItemForm} 
            class="bg-action-primary hover:bg-accent-hover active:bg-accent-hover text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center shadow-sm transition-colors"
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
            <span class="whitespace-nowrap">{showNewItemForm ? 'Cancel' : 'Add Item'}</span>
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
            {#if rangeReference}
              <button 
                on:click={sendRangeToAI}
                class="bg-action-primary hover:bg-accent-hover active:bg-accent-hover text-white p-1.5 rounded-md flex items-center justify-center shadow-sm"
                aria-label="Send {rangeReference} to AI"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            {/if}
            <button 
              on:click={() => exportToExcel(
        gridSource,
        gridColumns,
        result.estimate?.title
      )} 
              class="bg-action-success hover:bg-green-600 active:bg-green-700 text-white p-1.5 rounded-md flex items-center justify-center shadow-sm"
              aria-label="Export as Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button 
              on:click={handleAddColumn} 
              class="bg-action-secondary hover:bg-neutral-600 active:bg-neutral-600 text-white p-1.5 rounded-md flex items-center justify-center shadow-sm"
              aria-label="Add new column"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V9l-6-5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v5h5" />
              </svg>
            </button>
            <button 
              on:click={toggleNewItemForm} 
              class="bg-action-primary hover:bg-accent-hover active:bg-accent-hover text-white p-1.5 rounded-md flex items-center justify-center shadow-sm"
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
              <label for="item-description" class="block text-sm font-medium text-neutral-600 mb-1">Description</label>
              <input 
                id="item-description"
                type="text" 
                bind:value={newItem.description} 
                class="w-full p-2 border border-neutral-200 rounded-md"
                placeholder="Item description"
              />
            </div>
            <div>
              <label for="item-quantity" class="block text-sm font-medium text-neutral-600 mb-1">Quantity</label>
              <input 
                id="item-quantity"
                type="number" 
                bind:value={newItem.quantity} 
                min="0.01" 
                step="0.01"
                on:input={calculateAmount}
                class="w-full p-2 border border-neutral-200 rounded-md"
              />
            </div>
            <div>
              <label for="item-unit-type" class="block text-sm font-medium text-neutral-600 mb-1">Unit Type</label>
              <select 
                id="item-unit-type"
                bind:value={newItem.unitType} 
                class="w-full p-2 border border-neutral-200 rounded-md"
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
              <label for="item-cost-type" class="block text-sm font-medium text-neutral-600 mb-1">Cost Type</label>
              <select 
                id="item-cost-type"
                bind:value={newItem.costType} 
                class="w-full p-2 border border-neutral-200 rounded-md"
              >
                <option value="material">Material</option>
                <option value="labor">Labor</option>
                <option value="equipment">Equipment</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label for="item-unit-price" class="block text-sm font-medium text-neutral-600 mb-1">Unit Price</label>
              <input 
                id="item-unit-price"
                type="number" 
                bind:value={newItem.unitPrice} 
                min="0.01" 
                step="0.01"
                on:input={calculateAmount}
                class="w-full p-2 border border-neutral-200 rounded-md"
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
              class="bg-action-success hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Save Item
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  <div class="grid-container flex-1 h-[calc(90dvh-100px)] rounded-md overflow-hidden mobile-grid-container relative" bind:this={gridContainer} on:mouseup={handleMouseUp} role="grid" tabindex="0">
    <RevoGrid
      bind:this={revoGridInstance}
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
  </div>
{:else}
  <div class="bg-slate-50 p-4 rounded-md">
    <pre class="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
  </div>
{/if}

<!-- Column Management Dialog -->
{#if showColumnDialog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">
          {columnDialogMode === 'add' ? 'Add New Column' : 'Edit Column'}
        </h3>
        
        <div class="space-y-4">
          <div>
            <label for="column-name" class="block text-sm font-medium text-neutral-600 mb-1">
              Column Name
            </label>
            <input
              id="column-name"
              type="text"
              bind:value={newColumn.column_name}
              placeholder="Enter column name"
              class="w-full p-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-action-primary focus:border-action-primary"
            />
          </div>
          
          <div>
            <label for="data-type" class="block text-sm font-medium text-neutral-600 mb-1">
              Data Type
            </label>
            <select
              id="data-type"
              bind:value={newColumn.data_type}
              class="w-full p-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-action-primary focus:border-action-primary"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="integer">Integer</option>
              <option value="float">Float</option>
              <option value="date">Date</option>
              <option value="boolean">Boolean</option>
              <option value="select">Select/Dropdown</option>
            </select>
          </div>
          
          <div class="flex items-center">
            <input
              id="is-required"
              type="checkbox"
              bind:checked={newColumn.is_required}
              class="mr-2 rounded border-neutral-200 text-action-primary focus:ring-action-primary"
            />
            <label for="is-required" class="text-sm font-medium text-neutral-600">
              Required field
            </label>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6 pt-4 border-t">
          <button
            on:click={() => showColumnDialog = false}
            class="flex-1 px-4 py-2 text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            on:click={saveColumn}
            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {columnDialogMode === 'add' ? 'Add Column' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}