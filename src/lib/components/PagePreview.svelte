<script lang="ts">
	import type { LayoutResult } from '$lib/layout-engine';

	interface Props {
		html: string;
		layout: LayoutResult;
		theme: string;
	}

	let { html, layout, theme }: Props = $props();

	let pageEl: HTMLDivElement | undefined = $state();

	const pageStyle = $derived(
		`width: ${layout.pageWidth}px; min-height: ${layout.pageHeight}px; padding: ${layout.marginPx}px; font-size: ${layout.fontSize}px;`
	);

	const columnsClass = $derived(layout.columns > 1 ? `columns-${layout.columns}` : '');
</script>

<div class="page {theme}" style={pageStyle} bind:this={pageEl}>
	<div class="page-content {columnsClass}">
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
