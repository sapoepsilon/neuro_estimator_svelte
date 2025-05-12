<script lang="ts">
  import { RevoGrid, type ColumnRegular } from '@revolist/svelte-datagrid';

  export let result = null;
  export let onReset = () => {};
  
  let gridSource = [];
  let gridColumns = [];
  
  $: if (result && result.estimate && result.estimate.lineItems) {
    prepareGridData(result);
  }
  
  function prepareGridData(data) {
    gridSource = [];
    gridColumns = [];
    
    if (!data.estimate || !data.estimate.lineItems) return;
    
    gridColumns = [
      { prop: 'description', name: 'Description', size: 250, minSize: 200, maxSize: 500 },
      { prop: 'quantity', name: 'Quantity', size: 100, minSize: 80, maxSize: 150 },
      { prop: 'unitType', name: 'Unit Type', size: 100, minSize: 80, maxSize: 150 },
      { prop: 'unitPrice', name: 'Unit Price', size: 120, minSize: 100, maxSize: 200 },
      { prop: 'amount', name: 'Amount', size: 120, minSize: 100, maxSize: 200 }
    ];
    
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
      autoSizeColumn={true}
      exporting={true}
      stretch={true}
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

<style>
  /* Make the grid container take up all available space */
  .grid-container {
    height: calc(100vh - 300px); /* Adjust this value based on your layout */
    min-height: 400px;
    width: 100%;
    position: relative;
  }
  
  /* Override RevoGrid's default height settings */
  :global(.grid-container revo-grid) {
    height: 100% !important;
    min-height: 100% !important;
    width: 100% !important;
  }
  
  :global(.grid-container .rgViewport) {
    height: 100% !important;
  }
  
  :global(.grid-container .main-viewport) {
    height: 100% !important;
  }
</style>
