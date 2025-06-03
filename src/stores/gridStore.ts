import { writable } from 'svelte/store';

// Type for grid items that tracks both grid position and database row number
export type GridItem = {
  id: number | string;
  gridPosition: number;  // 1, 2, 3... (display position in grid)
  rowNumber: number;     // Database row_number (could be 9, 10, 11...)
  [key: string]: any;    // Other item properties (description, quantity, etc.)
};

// Store for grid data
export const gridData = writable<{
  gridSource: GridItem[];
  gridColumns: any[];
}>({
  gridSource: [],
  gridColumns: []
});

// Store for the current project ID
export const currentProjectId = writable<string | null>(null);
