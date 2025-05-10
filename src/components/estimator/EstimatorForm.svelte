<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { writable } from "svelte/store";
  import { createDefaultResponseStructure } from "$lib/types/estimateTypes";
  import { RevoGrid, type ColumnRegular } from '@revolist/svelte-datagrid';
  import { user } from '../../stores/authStore';
  import { supabase } from '$lib/supabase';

  let loading = false;
  let result = null;
  let error = null;
  let responseStructureJson = "";
  
  let gridSource = [];
  let gridColumns = [];

  const formData = writable({
    projectDetails: {
      title: "",
      description: "",
      scope: "",
      timeline: ""    },
    additionalRequirements: {
      feature1: "",
      feature2: ""
    },
    responseStructure: createDefaultResponseStructure()
  });

  // Convert response structure to JSON string for textarea
  function updateResponseStructureJson() {
    responseStructureJson = JSON.stringify($formData.responseStructure, null, 2);
  }

  // Update response structure from JSON string
  function updateResponseStructure() {
    try {
      $formData.responseStructure = JSON.parse(responseStructureJson);
      error = null;
    } catch (err) {
      error = 'Invalid JSON structure. Please check your syntax.';
      console.error('Error parsing JSON:', err);
    }
  }

  updateResponseStructureJson();

  async function handleSubmit() {
    loading = true;
    error = null;
    result = null;

    try {
      // Make sure the response structure is valid JSON
      updateResponseStructure();
      if (error) {
        loading = false;
        return;
      }

      // Get the current session for the JWT token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user is authenticated
      if (!$user || !session) {
        throw new Error('Authentication required. Please log in to generate an estimate.');
      }
      
      console.log(`Bearer ${session.access_token}`)
      const response = await fetch('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify($formData)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      result = await response.json();
      
      if (result && result.estimate && result.estimate.lineItems) {
        prepareGridData(result);
      }
    } catch (err) {
      error = err.message || 'Failed to generate estimate';
      console.error('Error submitting form:', err);
    } finally {
      loading = false;
    }
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

  // Reset form
  function resetForm() {
    $formData = {
      projectDetails: {
        title: "",
        description: "",
        scope: "",
        timeline: ""
      },
      additionalRequirements: {
        feature1: "",
        feature2: ""
      },
      responseStructure: createDefaultResponseStructure()
    };
    updateResponseStructureJson();
    result = null;
    error = null;
  }
</script>

<div class="container mx-auto py-8 px-4 max-w-full">
  <Card class="w-full max-w-3xl mx-auto">
    <CardHeader>
      <CardTitle class="text-2xl font-bold">Project Estimator</CardTitle>
      <CardDescription>Fill in the details to generate a project estimate</CardDescription>
    </CardHeader>
    <CardContent>
      {#if result}
        <div class="mb-6">
          <h3 class="text-xl font-semibold mb-4">Estimate Result: {result.estimate?.title || 'Project Estimate'}</h3>
          
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
              
              <div class="h-[400px] w-full">
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
          
          <Button class="mt-4" on:click={resetForm}>Create New Estimate</Button>
        </div>
      {:else}
        <form on:submit|preventDefault={handleSubmit}>
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-medium mb-4">Project Details</h3>
              <div class="space-y-4">
                <div class="space-y-2">
                  <label for="project-title" class="text-sm font-medium">Project Title</label>
                  <Input id="project-title" bind:value={$formData.projectDetails.title} placeholder="Enter project title" />
                </div>
                
                <div class="space-y-2">
                  <label for="project-description" class="text-sm font-medium">Project Description</label>
                  <Textarea 
                    id="project-description"
                    bind:value={$formData.projectDetails.description} 
                    placeholder="Provide a detailed description of your project" 
                    rows="4"
                  />
                </div>
                
                <div class="space-y-2">
                  <label for="project-scope" class="text-sm font-medium">Project Scope</label>
                  <Textarea 
                    id="project-scope"
                    bind:value={$formData.projectDetails.scope} 
                    placeholder="Define the scope of your project" 
                    rows="3"
                  />
                </div>
                
                <div class="space-y-2">
                  <label for="project-timeline" class="text-sm font-medium">Expected Timeline</label>
                  <Input 
                    id="project-timeline"
                    bind:value={$formData.projectDetails.timeline} 
                    placeholder="e.g., 3 months, 6 weeks" 
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-lg font-medium mb-4">Additional Requirements</h3>
              <div class="space-y-4">
                <div class="space-y-2">
                  <label for="feature-1" class="text-sm font-medium">Feature 1</label>
                  <Input 
                    id="feature-1"
                    bind:value={$formData.additionalRequirements.feature1} 
                    placeholder="Description of feature 1" 
                  />
                </div>
                
                <div class="space-y-2">
                  <label for="feature-2" class="text-sm font-medium">Feature 2</label>
                  <Input 
                    id="feature-2"
                    bind:value={$formData.additionalRequirements.feature2} 
                    placeholder="Description of feature 2" 
                  />
                </div>
              </div>
            </div>
            
          {#if error}
            <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              <p>{error}</p>
            </div>
          {/if}
          
          <div class="mt-6">
            <Button 
              type="submit" 
              disabled={loading}
              class="w-full"
            >
              {loading ? 'Generating Estimate...' : 'Generate Estimate'}
            </Button>
          </div>
        </form>
      {/if}
    </CardContent>
  </Card>
</div>
