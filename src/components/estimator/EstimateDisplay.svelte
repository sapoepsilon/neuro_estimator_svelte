<script lang="ts">
  import { RevoGrid, type ColumnRegular } from '@revolist/svelte-datagrid';
  import { Button } from "$lib/components/ui/button";

  export let result = null;
  export let onReset = () => {};
  
  let gridSource = [];
  let gridColumns = [];
  
  $: if (result && result.estimate && result.estimate.lineItems) {
    prepareGridData(result);
  }
  
  // Prepare data for RevoGrid
  function prepareGridData(data) {
    // Reset grid data
    gridSource = [];
    gridColumns = [];
    
    if (!data.estimate || !data.estimate.lineItems) return;
    
    // Create columns
    gridColumns = [
      { prop: 'description', name: 'Description', size: 250, minSize: 200, maxSize: 500 },
      { prop: 'quantity', name: 'Quantity', size: 100, minSize: 80, maxSize: 150 },
      { prop: 'unitType', name: 'Unit Type', size: 100, minSize: 80, maxSize: 150 },
      { prop: 'unitPrice', name: 'Unit Price', size: 120, minSize: 100, maxSize: 200 },
      { prop: 'amount', name: 'Amount', size: 120, minSize: 100, maxSize: 200 }
    ];
    
    // Process line items for the grid
    const flattenedItems = [];
    
    // Add the main line items
    data.estimate.lineItems.forEach((item, index) => {
      // Add the main item
      flattenedItems.push({
        id: `item-${index}`,
        description: item.description,
        quantity: item.quantity,
        unitType: item.unitType,
        unitPrice: item.unitPrice,
        amount: item.amount,
        isHeader: true
      });
      
      // Add sub-items if they exist
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem, subIndex) => {
          flattenedItems.push({
            id: `item-${index}-sub-${subIndex}`,
            description: `    ${subItem.description}`,  // Indent sub-items
            quantity: subItem.quantity,
            unitType: subItem.unitType,
            unitPrice: subItem.unitPrice,
            amount: subItem.amount,
            isSubItem: true
          });
        });
      }
    });
    
    // Add total row
    flattenedItems.push({
      id: 'total',
      description: 'Total',
      amount: data.estimate.totalAmount,
      isTotal: true
    });
    
    gridSource = flattenedItems;
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
    
    <div class="h-full w-full">
      <RevoGrid 
        source={gridSource} 
        columns={gridColumns}
        theme="material"
        resize={true}
        autoSizeColumn={true}
        exporting={true}
        stretch={true}
        rowClass={(row) => {
          if (row.isHeader) return 'font-semibold bg-slate-100';
          if (row.isSubItem) return 'text-sm text-slate-600';
          if (row.isTotal) return 'font-bold text-lg border-t-2';
          return '';
        }}
        style="width: 100%; height: 100%;"
      />
    </div>
  </div>
{:else}
  <div class="bg-slate-50 p-4 rounded-md">
    <pre class="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
  </div>
{/if}

<Button class="mt-4" on:click={onReset}>Create New Estimate</Button>
