import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cubicOut } from "svelte/easing";
import * as XLSX from 'xlsx';

export function exportToExcel(gridSource, gridColumns, estimateTitle = 'Project_Estimate') {
  if (!gridSource || gridSource.length === 0) {
    throw new Error('No data to export');
  }

  try {
    // Prepare data for export - filter out any special rows or formatting
    const exportData = gridSource.map(row => {
      // Create a clean object for each row, excluding any special properties
      const cleanRow = {};
      
      // Add data from each column
      gridColumns.forEach(col => {
        if (col.prop && typeof row[col.prop] !== 'undefined') {
          cleanRow[col.name || col.prop] = row[col.prop];
        }
      });
      
      return cleanRow;
    });

    // Create a worksheet from the data
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Create a workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estimate');
    
    // Generate filename based on estimate title
    const filename = `${estimateTitle}.xlsx`;
    
    // Export the workbook
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error; // Re-throw to allow calling component to handle the error
  }
}

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export const flyAndScale = (
	node,
	params = { y: -8, x: 0, start: 0.95, duration: 150 }
) => {
	const style = getComputedStyle(node);
	const transform = style.transform === "none" ? "" : style.transform;

	const scaleConversion = (valueA, scaleA, scaleB) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (style) => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, "");
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};