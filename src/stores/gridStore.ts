import { writable } from 'svelte/store';

// Store for grid data
export const gridData = writable({
  gridSource: [],
  gridColumns: []
});

// Store for the current project ID
export const currentProjectId = writable<string | null>(null);
