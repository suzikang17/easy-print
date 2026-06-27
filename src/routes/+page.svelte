<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import PagePreview from '$lib/components/PagePreview.svelte';
	import { parseContent } from '$lib/parser';
	import { computeLayout, type LayoutConfig } from '$lib/layout-engine';
	import { themes, type ThemeName } from '$lib/themes';
	import {
		getTemplate,
		detectTemplate,
		type TemplateName,
		type BlogStyle,
	} from '$lib/templates';

	// State
	let content = $state('');
	let theme: ThemeName = $state('modern');
	let maxPages = $state(1);
	let orientation: 'portrait' | 'landscape' = $state('portrait');
	let paperSize: 'letter' | 'a4' = $state('letter');
	let fontSizeOverride = $state('auto');
	let template = $state<TemplateName>('none');
	let blogStyle = $state<BlogStyle>('classic');

	// Derived
	let activeTemplate = $derived(getTemplate(template));
	let html = $derived(parseContent(content, activeTemplate?.transform));
	let templateClass = $derived(
		activeTemplate
			? `template-base ${activeTemplate.cssClass}` +
				(template === 'blogpost' ? ` blog-${blogStyle}` : '')
			: ''
	);

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
		// Templates flagged fitToContent read as a single flowing column,
		// regardless of the Pages selector.
		maxPages: activeTemplate?.fitToContent ? 0 : maxPages,
		orientation,
		fontSizeOverride: fontSizeValue,
	});

	let layout = $derived(computeLayout(measuredHeight, layoutConfig));

	let themeClass = $derived(themes.find((t) => t.name === theme)?.cssClass ?? 'theme-modern');

	// Auto-scale preview to fit pane width.
	let previewPaneEl: HTMLDivElement | undefined = $state();
	let paneWidth = $state(0);

	$effect(() => {
		if (!previewPaneEl) return;
		const measure = () => (paneWidth = previewPaneEl!.clientWidth - 32); // minus padding
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(previewPaneEl);
		return () => observer.disconnect();
	});

	// Derived so it recomputes when the page WIDTH changes too (e.g. switching to
	// landscape), not only when the pane is resized — otherwise landscape pages
	// keep the portrait scale and overflow the pane.
	let previewScale = $derived(paneWidth > 0 ? Math.min(1, paneWidth / layout.pageWidth) : 0.7);

	// --- Print header / footer ---
	let headerText = $state('');
	let footerText = $state('');
	let showPageNumbers = $state(false);

	function cssString(s: string): string {
		return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
	}

	// @page rules consumed by Paged.js for BOTH the on-screen preview and print,
	// so what you see is exactly what prints (running headers/footers included).
	let pageCss = $derived.by(() => {
		const f = 'font: 9pt Georgia, "Times New Roman", serif; color: #555;';
		return `@page {
			size: ${orientation === 'landscape' ? 'letter landscape' : 'letter'};
			margin: 0.6in;
			${headerText ? `@top-left { content: ${cssString(headerText)}; ${f} }` : ''}
			${footerText ? `@bottom-left { content: ${cssString(footerText)}; ${f} }` : ''}
			${showPageNumbers ? `@bottom-right { content: "Page " counter(page) " of " counter(pages); ${f} }` : ''}
		}`;
	});

	function handlePrint() {
		// The preview already IS the Paged.js output, so just print it.
		window.print();
	}

	// --- Page-thumbnail minimap (like a code-editor minimap) ---
	let minimapEl: HTMLElement | undefined = $state();

	function buildMinimap(pagesRoot: HTMLDivElement) {
		if (!minimapEl) return;
		const pages = Array.from(pagesRoot.querySelectorAll('.pagedjs_page')) as HTMLElement[];
		const scale = 104 / layout.pageWidth;
		minimapEl.innerHTML = '';
		pages.forEach((pg, i) => {
			const thumb = document.createElement('button');
			thumb.className = 'minimap-thumb';
			thumb.style.width = `${layout.pageWidth * scale}px`;
			thumb.style.height = `${layout.pageHeight * scale}px`;
			thumb.title = `Page ${i + 1}`;

			const inner = document.createElement('div');
			inner.className = 'minimap-scale';
			inner.style.transform = `scale(${scale})`;
			inner.style.width = `${layout.pageWidth}px`;
			inner.appendChild(pg.cloneNode(true));
			thumb.appendChild(inner);

			const num = document.createElement('span');
			num.className = 'minimap-num';
			num.textContent = String(i + 1);
			thumb.appendChild(num);

			thumb.onclick = () => pages[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
			minimapEl!.appendChild(thumb);
		});
	}
</script>

<svelte:head>
	<title>Easy Print</title>
</svelte:head>

<div class="app no-print-wrapper">
	<Toolbar
		{theme}
		{template}
		{blogStyle}
		{maxPages}
		{orientation}
		{fontSizeOverride}
		onthemechange={(t) => (theme = t)}
		ontemplatechange={(t) => (template = t)}
		onblogstylechange={(s) => (blogStyle = s)}
		onpageschange={(p) => (maxPages = p)}
		onorientationchange={(o) => (orientation = o)}
		onfontsizechange={(s) => (fontSizeOverride = s)}
		onprint={handlePrint}
	/>

	<div class="print-bar no-print">
		<span class="print-bar-label">Print header / footer</span>
		<input class="print-input" placeholder="Header (left)" bind:value={headerText} />
		<input class="print-input" placeholder="Footer (left)" bind:value={footerText} />
		<label class="print-check">
			<input type="checkbox" bind:checked={showPageNumbers} />
			Page numbers
		</label>
	</div>

	<div class="workspace">
		<div class="editor-pane no-print">
			<Editor
				value={content}
				onchange={(v) => (content = v)}
				onimport={(md) => (template = detectTemplate(md))}
			/>
		</div>

		<div class="preview-wrap">
			<div class="preview-pane" bind:this={previewPaneEl}>
				<div class="preview-scroll" style="transform: scale({previewScale})">
					{#if html}
						<PagePreview
							{html}
							{layout}
							{pageCss}
							theme="{themeClass} {templateClass}"
							onrender={buildMinimap}
						/>
					{:else}
						<div class="empty-state">
							<p>Type or paste content on the left to see a live preview.</p>
						</div>
					{/if}
				</div>
			</div>

			{#if html}
				<aside class="minimap no-print" bind:this={minimapEl}></aside>
			{/if}
		</div>
	</div>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.print-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 16px;
		background: #fafafa;
		border-bottom: 1px solid #e2e8f0;
		flex-wrap: wrap;
	}

	.print-bar-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #888;
	}

	.print-input {
		padding: 5px 9px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 13px;
		min-width: 180px;
	}

	.print-check {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		color: #555;
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

	.preview-wrap {
		flex: 1;
		display: flex;
		overflow: hidden;
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

	/* Minimap: scaled page thumbnails for quick navigation. */
	.minimap {
		flex: 0 0 auto;
		width: 132px;
		overflow-y: auto;
		padding: 16px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		background: #f1f1f1;
		border-left: 1px solid #e2e8f0;
	}

	.minimap :global(.minimap-thumb) {
		position: relative;
		padding: 0;
		border: 1px solid #cbd5e1;
		background: white;
		cursor: pointer;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		flex: 0 0 auto;
	}

	.minimap :global(.minimap-thumb:hover) {
		border-color: #3b82f6;
	}

	.minimap :global(.minimap-scale) {
		transform-origin: top left;
		pointer-events: none;
	}

	.minimap :global(.minimap-num) {
		position: absolute;
		bottom: 2px;
		right: 3px;
		font-size: 9px;
		color: #64748b;
		background: rgba(255, 255, 255, 0.85);
		padding: 0 3px;
		border-radius: 2px;
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

		/* Release the on-screen height/overflow constraints so content can
		   paginate across multiple printed pages instead of clipping at one. */
		.app {
			display: block;
			height: auto;
			overflow: visible;
		}

		.workspace {
			display: block;
			overflow: visible;
		}

		.preview-wrap {
			display: block;
			overflow: visible;
		}

		.preview-pane {
			display: block;
			padding: 0;
			overflow: visible;
		}

		.preview-scroll {
			transform: none !important;
		}
	}
</style>
