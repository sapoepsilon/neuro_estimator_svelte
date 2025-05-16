<script lang="ts">
  import { onMount } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog';

  export let open = false;
  export let onOpenChange = (open: boolean) => {};
  
  // Track which phase is expanded
  let expandedPhase: string | null = 'phase1';
  let contentRef: HTMLDivElement;
  
  // Roadmap data for both toggle view and Gantt chart
  const roadmapData = [
    { id: 'phase1', title: 'Phase 1: AI-Enhanced Estimate Sheets', status: 'in-progress', progress: 90, startDate: '2025-04', endDate: '2025-05', description: 'Instantly generate highly accurate sheets with AI-powered data entry and intelligent suggestions.' },
    { id: 'phase2', title: 'Phase 2: Iterative Estimation & File Support', status: 'upcoming', progress: 0, startDate: '2025-05', endDate: '2025-06', description: 'Seamlessly upload and iterate on existing estimate files with automatic version control.' },
    { id: 'phase3', title: 'Phase 3: Document Knowledge Base', status: 'planned', progress: 0, startDate: '2025-06', endDate: '2025-06', description: 'Search and extract insights from your uploaded documents with our AI-powered knowledge base system.' },
    { id: 'phase4', title: 'Phase 4: Tooling & Integrations', status: 'planned', progress: 0, startDate: '2025-06', endDate: '2025-07', description: 'Integrate with popular tools and services to streamline your workflow.' },
    { id: 'phase5', title: 'Phase 5: VLM-Powered Takeoffs', status: 'planned', progress: 0, startDate: '2025-07', endDate: '2025-08', description: 'Automatically generate detailed quantity takeoffs directly from digital floor plans and PDFs.' }
  ];

  onMount(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      open = true;
      localStorage.setItem('hasSeenWelcome', 'true');
    }
    
    // Ensure content is scrolled to the top when dialog opens
    if (contentRef) {
      contentRef.scrollTo(0, 0);
    }
  });

  function handleOpenChange(event: CustomEvent<boolean>) {
    const isOpen = event.detail;
    open = isOpen;
    onOpenChange(isOpen);
  }

  function togglePhase(id: string) {
    expandedPhase = expandedPhase === id ? null : id;
  }

  function getStatusColor(status: string) {
    switch(status) {
      case 'in-progress': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-400';
      case 'planned': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  }

  function getStatusText(status: string) {
    switch(status) {
      case 'in-progress': return 'In Progress';
      case 'upcoming': return 'Coming Soon';
      case 'planned': return 'Planned';
      default: return 'Planned';
    }
  }
</script>

<Dialog.Root bind:open on:openChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 bg-black/50 z-50" />
    <Dialog.Content class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[750px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl border border-gray-100">
      <Dialog.Header>
        <Dialog.Title class="text-2xl font-bold text-center text-primary">Welcome to Estimating Agent</Dialog.Title>
        <Dialog.Description class="text-center text-gray-600 mt-2 text-base">
          AI-Powered Construction Estimation
        </Dialog.Description>
      </Dialog.Header>

      <div class="mt-5 overflow-y-auto max-h-[calc(85vh-120px)]" bind:this={contentRef}>
        <div class="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 shadow-sm">
          <h3 class="font-semibold text-amber-800 text-sm">Alpha Release</h3>
          <p class="text-amber-700 text-sm mt-1">
            This project is in alpha and may contain bugs. Feedback is appreciated!
          </p>
        </div>

        <!-- Gantt Chart Visualization -->
        <div class="mb-5">
          <h3 class="text-base font-semibold mb-3">Development Timeline</h3>
          <div class="relative h-14 bg-gray-100 rounded-md w-full overflow-hidden shadow-inner">
            {#each roadmapData as phase, i}
              <div 
                class="absolute h-8 top-3 rounded-md {getStatusColor(phase.status)} border border-white shadow-sm transition-all hover:brightness-110" 
                style="left: {i * 20}%; width: 19%;"
                title="{phase.title}: {phase.startDate} - {phase.endDate}"
              >
                <span class="text-xs text-white font-medium px-2 py-1 truncate block">{i+1}</span>
              </div>
            {/each}
            <!-- Current time marker -->
            <div class="absolute h-full w-1 bg-red-500 left-[18%] z-10 shadow-md"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-600 mt-2 font-medium">
            <span>May 2025</span>
            <span>May 2025</span>
            <span>Jun 2025</span>
            <span>Jul 2025</span>
            <span>Aug 2025</span>
          </div>
        </div>

        <!-- Roadmap with Custom Toggles -->
        <div class="mb-4">
          <h3 class="text-base font-semibold mb-3">Our Roadmap</h3>
          
          <div class="w-full">
            {#each roadmapData as phase}
              <div class="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                <!-- Toggle Header -->
                <button 
                  class="flex w-full items-center justify-between py-3 text-left transition-colors" 
                  on:click={() => togglePhase(phase.id)}
                  aria-expanded={expandedPhase === phase.id}
                >
                  <div class="flex items-center">
                    <div class="h-3 w-3 rounded-full {getStatusColor(phase.status)} mr-3 shadow-sm"></div>
                    <span class="text-base font-medium">{phase.title}</span>
                  </div>
                  <div class="flex items-center">
                    <span class="text-sm text-gray-600 mr-3 font-medium">{getStatusText(phase.status)}</span>
                    <svg 
                      class="h-5 w-5 transition-transform {expandedPhase === phase.id ? 'rotate-180' : ''}" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="2" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </button>
                
                <!-- Toggle Content -->
                {#if expandedPhase === phase.id}
                  <div class="pb-3 pt-1 px-2 bg-gray-50 rounded-md my-1 mx-2 shadow-inner">
                    <p class="text-sm text-gray-700">{phase.description}</p>
                    {#if phase.id === 'phase3'}
                      <ul class="list-disc ml-6 mt-2 text-gray-700 text-sm space-y-1">
                        <li>Automatic document indexing and semantic search</li>
                        <li>Extract key information from construction documents</li>
                      </ul>
                    {:else if phase.id === 'phase4'}
                      <ul class="list-disc ml-6 mt-2 text-gray-700 text-sm space-y-1">
                        <li>Google search integration for faster research</li>
                        <li>Price tracking and alerts for materials and labor</li>
                      </ul>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>

      <Dialog.Footer class="mt-5 flex justify-end">
        <Dialog.Close class="px-5 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all hover:shadow-md text-base font-medium">
          Got it
        </Dialog.Close>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
