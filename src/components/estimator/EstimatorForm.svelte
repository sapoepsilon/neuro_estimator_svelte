<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { writable } from "svelte/store";
  import { createDefaultResponseStructure } from "$lib/types/estimateTypes";
  import { user } from '../../stores/authStore';
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import EstimateDisplay from './EstimateDisplay.svelte';
  import { API_AGENT_URL } from "$lib/components/ui/sidebar/constants";

  export let projectId = null;
  export let projectData = null;

  let loading = false;
  let result = null;
  let error = null;
  let responseStructureJson = "";
  let saveLoading = false;
  let saveSuccess = false;

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
  
  onMount(() => {
    if (projectData) {
      $formData.projectDetails.title = projectData.name || '';
      $formData.projectDetails.description = projectData.description || '';
    }
  });

  function updateResponseStructureJson() {
    responseStructureJson = JSON.stringify($formData.responseStructure, null, 2);
  }

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
      updateResponseStructure();
      if (error) {
        loading = false;
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!$user || !session) {
        throw new Error('Authentication required. Please log in to generate an estimate.');
      }
      
      let currentProjectId = projectId;
      if (!currentProjectId) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert([
            { 
              name: $formData.projectDetails.title,
              description: $formData.projectDetails.description,
              created_by: $user.id
            }
          ])
          .select()
          .single();
        
        if (projectError) {
          throw new Error(`Failed to create project: ${projectError.message}`);
        }
        
        currentProjectId = projectData.id;
      }
      
      const response = await fetch(API_AGENT_URL, {
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
        await saveEstimateItems(currentProjectId, result.estimate);
      }
    } catch (err) {
      error = err.message || 'Failed to generate estimate';
      console.error('Error submitting form:', err);
    } finally {
      loading = false;
    }
  }
  
  async function saveEstimateItems(projectId, estimate) {
    saveLoading = true;
    try {
      const { error: deleteError } = await supabase
        .from('estimate_items')
        .delete()
        .eq('project_id', projectId);
      
      if (deleteError) throw deleteError;
      
      const itemsToInsert = [];
      
      estimate.lineItems.forEach((item, index) => {
        const mainItem = {
          project_id: projectId,
          title: item.description,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          unit_type: item.unitType || 'unit',
          amount: item.amount || 0,
          currency: estimate.currency || 'USD',
          is_sub_item: false,
          created_by: $user.id,
          status: 'active'
        };
        
        itemsToInsert.push(mainItem);
        
        if (item.subItems && item.subItems.length > 0) {
        }
      });
      
      // Insert main items
      const { data: insertedItems, error: insertError } = await supabase
        .from('estimate_items')
        .insert(itemsToInsert)
        .select();
      
      if (insertError) throw insertError;
      
      // Now insert sub-items with parent references
      const subItemsToInsert = [];
      
      // Map to find parent items by description
      const parentItemMap = {};
      insertedItems.forEach(item => {
        parentItemMap[item.title] = item.id;
      });
      
      // Process sub-items
      estimate.lineItems.forEach((item) => {
        const parentId = parentItemMap[item.description];
        
        if (parentId && item.subItems && item.subItems.length > 0) {
          item.subItems.forEach(subItem => {
            subItemsToInsert.push({
              project_id: projectId,
              parent_item_id: parentId,
              title: subItem.description,
              description: subItem.description,
              quantity: subItem.quantity || 1,
              unit_price: subItem.unitPrice || 0,
              unit_type: subItem.unitType || 'unit',
              amount: subItem.amount || 0,
              currency: estimate.currency || 'USD',
              is_sub_item: true,
              created_by: $user.id,
              status: 'active'
            });
          });
        }
      });
      
      // Insert sub-items if any
      if (subItemsToInsert.length > 0) {
        const { error: subItemError } = await supabase
          .from('estimate_items')
          .insert(subItemsToInsert);
        
        if (subItemError) throw subItemError;
      }
      
      saveSuccess = true;
      
      // Navigate to the project view
      setTimeout(() => {
        window.location.hash = `/estimator?id=${projectId}`;
      }, 1000);
      
    } catch (err) {
      console.error('Error saving estimate items:', err);
      error = 'Failed to save estimate items to database';
    } finally {
      saveLoading = false;
    }
  }
</script>

<div class="container mx-auto py-8 px-4 max-w-full overflow-auto" style="max-height: 90vh;">
  <Card class="w-full max-w-3xl mx-auto overflow-auto">
    <CardHeader>
      <CardTitle class="text-2xl font-bold">Project Estimator</CardTitle>
      <CardDescription>Fill in the details to generate a project estimate</CardDescription>
    </CardHeader>
    <CardContent class="overflow-y-auto">
      {#if result}
        <div class="mb-6">
          <h3 class="text-xl font-semibold mb-4">Estimate Result: {result.estimate?.title || 'Project Estimate'}</h3>
          
          <EstimateDisplay 
            {result} 
          />
        </div>
      {:else}
        <form on:submit|preventDefault={handleSubmit}>
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-medium mb-4">Project Details</h3>
              <div class="space-y-4">
                <div class="space-y-2">
                  <label for="project-title" class="text-sm font-medium">Project Title</label>
                  <Input id="project-title" bind:value={$formData.projectDetails.title} placeholder="Enter project title" type="text" class="w-full" />
                </div>
                
                <div class="space-y-2">
                  <label for="project-description" class="text-sm font-medium">Project Description</label>
                  <Textarea 
                    id="project-description"
                    bind:value={$formData.projectDetails.description} 
                    placeholder="Provide a detailed description of your project" 
                    rows="4"
                    class="w-full"
                  />
                </div>
                
                <div class="space-y-2">
                  <label for="project-scope" class="text-sm font-medium">Project Scope</label>
                  <Textarea 
                    id="project-scope"
                    bind:value={$formData.projectDetails.scope} 
                    placeholder="Define the scope of your project" 
                    rows="3"
                    class="w-full"
                  />
                </div>
                
                <div class="space-y-2">
                  <label for="project-timeline" class="text-sm font-medium">Expected Timeline</label>
                  <Input 
                    id="project-timeline"
                    bind:value={$formData.projectDetails.timeline} 
                    placeholder="e.g., 3 months, 6 weeks" 
                    type="text"
                    class="w-full"
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
                    type="text"
                    class="w-full"
                  />
                </div>
                
                <div class="space-y-2">
                  <label for="feature-2" class="text-sm font-medium">Feature 2</label>
                  <Input 
                    id="feature-2"
                    bind:value={$formData.additionalRequirements.feature2} 
                    placeholder="Description of feature 2" 
                    type="text"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
            
          {#if error}
            <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              <p>{error}</p>
            </div>
          {/if}
          
          {#if saveLoading}
            <div class="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md flex items-center">
              <div class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-700 mr-2"></div>
              <p>Saving estimate items to database...</p>
            </div>
          {/if}
          
          {#if saveSuccess}
            <div class="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
              <p>Estimate items saved successfully! Redirecting to project view...</p>
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