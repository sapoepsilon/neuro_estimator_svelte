<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { writable } from "svelte/store";
  import { createDefaultResponseStructure } from "$lib/types/estimateTypes";
  import { user } from '../../stores/authStore';
  import { supabase } from '$lib/supabase';
  import EstimateDisplay from './EstimateDisplay.svelte';

  let loading = false;
  let result = null;
  let error = null;
  let responseStructureJson = "";

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
    } catch (err) {
      error = err.message || 'Failed to generate estimate';
      console.error('Error submitting form:', err);
    } finally {
      loading = false;
    }
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
          
          <EstimateDisplay 
            {result} 
            onReset={resetForm} 
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
