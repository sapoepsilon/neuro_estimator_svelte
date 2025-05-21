<script>
	import { Toaster as Sonner } from "svelte-sonner";
	import { cn } from "$lib/utils";
	import { theme } from "../../../../stores/themeStore";
	
	/**
	 * @type {string}
	 */
	export let className = "";
</script>

<Sonner
	class={cn(
		"fixed top-4 right-4 z-[100] flex w-full max-w-[420px] flex-col gap-2",
		className
	)}
	theme={$theme}
	{...$$restProps}
/>
