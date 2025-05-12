<script lang="ts">
  import { RevoGrid } from '@revolist/svelte-datagrid';
  import { onMount } from 'svelte';

  export let result: any = null;
  let gridSource: any[] = [];
  let gridColumns: any[] = [];
  
  const COLUMN_WIDTHS_KEY = 'neuro-estimator-column-widths';
  
  type ColumnRegular = {
    prop: string;
    name: string;
    size: number;
    minSize?: number;
    maxSize?: number;
    sortable?: boolean;
    filter?: boolean;
    columnType?: string;
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
      }
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
  function saveColumnWidths(columnDetails: ColumnResizeDetail) {
    try {
      const widthsToSave = {};
      
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