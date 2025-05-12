<script lang="ts">
  import { onMount } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog';

  export let open = false;
  export let onOpenChange = (open: boolean) => {};

  onMount(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      open = true;
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  });
  function handleOpenChange(event: CustomEvent<boolean>) {
    const isOpen = event.detail;
    open = isOpen;
    onOpenChange(isOpen);
  }
</script>

<Dialog.Root bind:open on:openChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 bg-black/50 z-50" />
    <Dialog.Content class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
      <Dialog.Header>
        <Dialog.Title class="text-2xl font-bold text-center text-primary">Welcome to Neuro Estimator</Dialog.Title>
        <Dialog.Description class="text-center text-gray-600 mt-2">
          AI-Powered Construction Estimation
        </Dialog.Description>
      </Dialog.Header>

      <div class="mt-6">
        <div class="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <h3 class="font-semibold text-amber-800">Alpha Release</h3>
          <p class="text-amber-700 mt-1">
            This project is currently in alpha and may contain bugs. It's being rapidly developed, and any feedback is greatly appreciated!
          </p>
        </div>

        <h3 class="text-lg font-semibold mb-3">Our Roadmap</h3>
        
        <div class="space-y-6">
          <div class="border-l-4 border-green-500 pl-4 py-1">
            <h4 class="font-semibold text-green-700">Phase 1 (MVP): AI-Enhanced Estimate Sheets</h4>
            <p class="text-gray-600 text-sm mt-1">Instantly generate highly accurate sheets with AI-powered data entry and intelligent suggestions.</p>
            <div class="mt-2 flex items-center">
              <div class="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <span class="text-xs text-green-700 font-medium">Almost complete - Ironing out bugs</span>
            </div>
          </div>
          
          <div class="border-l-4 border-gray-300 pl-4 py-1">
            <h4 class="font-semibold text-gray-700">Phase 2: Iterative Estimation & File Support</h4>
            <p class="text-gray-600 text-sm mt-1">Seamlessly upload and iterate on existing estimate files with automatic version control.</p>
            <div class="mt-2 flex items-center">
              <div class="h-2 w-2 rounded-full bg-gray-300 mr-2"></div>
              <span class="text-xs text-gray-500 font-medium">Coming soon</span>
            </div>
          </div>
          
          <div class="border-l-4 border-gray-300 pl-4 py-1">
            <h4 class="font-semibold text-gray-700">Phase 3: Tooling & Integrations</h4>
            <p class="text-gray-600 text-sm mt-1">
              Integrate with popular tools and services to streamline your workflow, such as:
            </p>
            <ul class="list-disc ml-4 mt-1 text-gray-600 text-sm">
              <li>Google search integration for faster research</li>
              <li>Price tracking and alerts for materials and labor</li>
              <li>Seamless integration with popular accounting software</li>
              <li>More to come!</li>
            </ul>
            <div class="mt-2 flex items-center">
              <div class="h-2 w-2 rounded-full bg-gray-300 mr-2"></div>
              <span class="text-xs text-gray-500 font-medium">Planned</span>
            </div>
          </div>
          
          <div class="border-l-4 border-gray-300 pl-4 py-1">
            <h4 class="font-semibold text-gray-700">Phase 4: VLM-Powered Takeoffs from Floor Plans</h4>
            <p class="text-gray-600 text-sm mt-1">Automatically generate detailed quantity takeoffs directly from digital floor plans and PDFs.</p>
            <div class="mt-2 flex items-center">
              <div class="h-2 w-2 rounded-full bg-gray-300 mr-2"></div>
              <span class="text-xs text-gray-500 font-medium">Planned</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog.Footer class="mt-6 flex justify-end">
        <Dialog.Close class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
          Got it
        </Dialog.Close>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
