<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import PagePreview from '$lib/components/PagePreview.svelte';
	import { parseContent } from '$lib/parser';
	import { computeLayout, type LayoutConfig } from '$lib/layout-engine';
	import { themes, type ThemeName } from '$lib/themes';
	import { getTemplate, type TemplateName } from '$lib/templates';

	// State
	let content = $state('');
	let theme: ThemeName = $state('modern');
	let maxPages = $state(1);
	let orientation: 'portrait' | 'landscape' = $state('portrait');
	let paperSize: 'letter' | 'a4' = $state('letter');
	let fontSizeOverride = $state('auto');
	let template: TemplateName = $state('none');

	// Derived
	let activeTemplate = $derived(getTemplate(template));
	let html = $derived(parseContent(content, activeTemplate?.transform));
	let templateClass = $derived(activeTemplate?.cssClass ?? '');

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

	let measuredHeight = $state(0);

	let layoutConfig = $derived<LayoutConfig>({
		pageWidth: pageDimensions.w,
		pageHeight: pageDimensions.h,
		maxPages,
		orientation,
		fontSizeOverride: fontSizeValue,
	});

	let layout = $derived(computeLayout(measuredHeight, layoutConfig));

	let themeClass = $derived(themes.find((t) => t.name === theme)?.cssClass ?? 'theme-modern');

	// Auto-scale preview to fit pane width
	let previewPaneEl: HTMLDivElement | undefined = $state();
	let previewScale = $state(0.7);

	$effect(() => {
		if (!previewPaneEl) return;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const paneWidth = entry.contentRect.width - 32; // subtract padding
				const scale = Math.min(1, paneWidth / layout.pageWidth);
				previewScale = scale;
			}
		});
		observer.observe(previewPaneEl);
		return () => observer.disconnect();
	});

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
		{template}
		{maxPages}
		{orientation}
		{paperSize}
		{fontSizeOverride}
		onthemechange={(t) => (theme = t)}
		ontemplatechange={(t) => (template = t)}
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

		<div class="preview-pane" bind:this={previewPaneEl}>
			<div class="preview-scroll" style="transform: scale({previewScale})">
				{#if html}
					<PagePreview {html} {layout} theme="{themeClass} {templateClass}" onmeasure={(h) => (measuredHeight = h)} />
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
