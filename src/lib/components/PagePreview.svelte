<script lang="ts">
	import type { LayoutResult } from '$lib/layout-engine';

	interface Props {
		html: string;
		layout: LayoutResult;
		theme: string;
		onmeasure?: (height: number) => void;
	}

	let { html, layout, theme, onmeasure }: Props = $props();

	let contentEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (contentEl && onmeasure && html) {
			// Measure at default single-column, default font size to get raw content height
			onmeasure(contentEl.scrollHeight);
		}
	});

	const pageStyle = $derived(
		`width: ${layout.pageWidth}px; min-height: ${layout.pageHeight}px; padding: ${layout.marginPx}px; font-size: ${layout.fontSize}px;`
	);

	const columnsClass = $derived(layout.columns > 1 ? `columns-${layout.columns}` : '');
</script>

<div class="page {theme}" style={pageStyle}>
	<div class="page-content {columnsClass}" bind:this={contentEl}>
		{@html html}
	</div>
</div>

<style>
	.page {
		background: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		border-radius: 2px;
		overflow: hidden;
	}
</style>
