<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import PagePreview from '$lib/components/PagePreview.svelte';
	import { parseContent } from '$lib/parser';
	import { computeLayout, type LayoutConfig } from '$lib/layout-engine';
	import { themes, type ThemeName } from '$lib/themes';

	// State
	let content = $state('');
	let theme: ThemeName = $state('modern');
	let maxPages = $state(1);
	let orientation: 'portrait' | 'landscape' = $state('portrait');
	let paperSize: 'letter' | 'a4' = $state('letter');
	let fontSizeOverride = $state('auto');

	// Derived
	let html = $derived(parseContent(content));

	let pageDimensions = $derived.by(() => {
		if (paperSize === 'letter') return { w: 816, h: 1056 };
		return { w: 794, h: 1123 }; // A4
	});

	let fontSizeValue = $derived.by((): number | null => {
		if (fontSizeOverride === 'small') return 11;
		if (fontSizeOverride === 'medium') return 14;
		if (fontSizeOverride === 'large') return 18;
		return null;
	});

	// Estimate based on character count and line count as a starting heuristic.
	// Task 9 will add real DOM measurement.
	let estimatedHeight = $derived.by(() => {
		if (!content.trim()) return 0;
		const lines = content.split('\n').length;
		const avgLineHeight = 22;
		return lines * avgLineHeight;
	});

	let layoutConfig = $derived<LayoutConfig>({
		pageWidth: pageDimensions.w,
		pageHeight: pageDimensions.h,
		maxPages,
		orientation,
		fontSizeOverride: fontSizeValue,
	});

	let layout = $derived(computeLayout(estimatedHeight, layoutConfig));

	let themeClass = $derived(themes.find((t) => t.name === theme)?.cssClass ?? 'theme-modern');

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Easy Print</title>
</svelte:head>

<div class="app no-print-wrapper">
	<Toolbar
		{theme}
		{maxPages}
		{orientation}
		{paperSize}
		{fontSizeOverride}
		onthemechange={(t) => (theme = t)}
		onpageschange={(p) => (maxPages = p)}
		onorientationchange={(o) => (orientation = o)}
		onpapersizechange={(s) => (paperSize = s)}
		onfontsizechange={(s) => (fontSizeOverride = s)}
		onprint={handlePrint}
	/>

	<div class="workspace">
		<div class="editor-pane no-print">
			<Editor value={content} onchange={(v) => (content = v)} />
		</div>

		<div class="preview-pane">
			<div class="preview-scroll">
				{#if html}
					<PagePreview {html} {layout} theme={themeClass} />
				{:else}
					<div class="empty-state">
						<p>Type or paste content on the left to see a live preview.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.workspace {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.editor-pane {
		width: 40%;
		padding: 16px;
		overflow-y: auto;
	}

	.preview-pane {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
		display: flex;
		justify-content: center;
	}

	.preview-scroll {
		transform-origin: top center;
		transform: scale(0.7);
	}

	.empty-state {
		color: #999;
		font-size: 15px;
		text-align: center;
		margin-top: 100px;
	}

	@media print {
		.no-print-wrapper .editor-pane,
		.no-print-wrapper :global(.no-print) {
			display: none !important;
		}

		.workspace {
			display: block;
		}

		.preview-pane {
			padding: 0;
		}

		.preview-scroll {
			transform: none !important;
		}
	}
</style>
