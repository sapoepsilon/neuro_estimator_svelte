<script lang="ts">
  import { Home, FolderKanban, Settings, Plus, ChevronRight, ChevronLeft } from "lucide-svelte";
  
  // Sidebar state
  let collapsed = false;
  let width = collapsed ? "64px" : "250px";
  
  // Dummy projects data
  const projects = [
    {
      id: 1,
      name: "Office Building Renovation",
      url: "#/estimator?id=1",
      createdAt: "2025-04-15"
    },
    {
      id: 2,
      name: "Hospital Wing Extension",
      url: "#/estimator?id=2",
      createdAt: "2025-04-20"
    },
    {
      id: 3,
      name: "Residential Complex",
      url: "#/estimator?id=3",
      createdAt: "2025-05-01"
    }
  ];
  
  // Navigation items
  const navItems = [
    {
      title: "Home",
      url: "#/",
      icon: Home
    },
    {
      title: "Projects",
      url: "#/projects",
      icon: FolderKanban
    },
    {
      title: "Settings",
      url: "#/settings",
      icon: Settings
    }
  ];
  
  function createNewProject() {
    window.location.hash = '/estimator';
  }
  
  function toggleSidebar() {
    collapsed = !collapsed;
    width = collapsed ? "64px" : "250px";
  }
</script>

<div 
  class="h-full flex flex-col border-r bg-background transition-all duration-300 ease-in-out" 
  style="width: {width}; min-width: {width}; max-width: {width};"
>
  <!-- Header -->
  <div class="p-4 border-b flex items-center justify-between">
    {#if !collapsed}
      <h2 class="text-lg font-semibold">Neuro Estimator</h2>
    {/if}
    <button 
      class="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" 
      on:click={toggleSidebar}
    >
      {#if collapsed}
        <ChevronRight class="h-5 w-5" />
      {:else}
        <ChevronLeft class="h-5 w-5" />
      {/if}
    </button>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-auto py-2">
    <!-- Navigation Section -->
    <div class="px-3 py-2">
      {#if !collapsed}
        <h3 class="mb-2 px-2 text-xs font-semibold text-slate-500">Navigation</h3>
      {/if}
      <nav>
        <ul class="space-y-1">
          {#each navItems as item}
            <li>
              <a 
                href={item.url} 
                class="flex items-center px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svelte:component this={item.icon} class="h-5 w-5 text-slate-600" />
                {#if !collapsed}
                  <span class="ml-3 text-sm">{item.title}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
    
    <!-- Projects Section -->
    <div class="mt-6 px-3 py-2">
      <div class="flex items-center justify-between mb-2 px-2">
        {#if !collapsed}
          <h3 class="text-xs font-semibold text-slate-500">Projects</h3>
          <button 
            class="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" 
            on:click={createNewProject}
            title="Create new project"
          >
            <Plus class="h-4 w-4 text-slate-600" />
          </button>
        {:else}
          <button 
            class="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mx-auto" 
            on:click={createNewProject}
            title="Create new project"
          >
            <Plus class="h-4 w-4 text-slate-600" />
          </button>
        {/if}
      </div>
      <nav>
        <ul class="space-y-1">
          {#each projects as project}
            <li>
              <a 
                href={project.url} 
                class="flex items-center px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FolderKanban class="h-5 w-5 text-slate-600" />
                {#if !collapsed}
                  <span class="ml-3 text-sm truncate">{project.name}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
  </div>
  
  <!-- Footer -->
  <div class="p-4 border-t text-xs text-slate-500">
    {#if !collapsed}
      <p>Neuro Estimator v1.0</p>
    {/if}
  </div>
</div>
