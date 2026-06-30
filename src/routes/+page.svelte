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

	// Proportional two-way scroll sync between the editor and the preview.
	$effect(() => {
		const editor = document.getElementById('content-input');
		const preview = previewPaneEl;
		if (!editor || !preview) return;
		let lock: string | null = null;
		let release: ReturnType<typeof setTimeout>;
		const sync = (src: HTMLElement, dst: HTMLElement, who: string) => {
			if (lock && lock !== who) return; // ignore the echo from our own scroll
			const srcMax = src.scrollHeight - src.clientHeight;
			const dstMax = dst.scrollHeight - dst.clientHeight;
			if (srcMax <= 0 || dstMax <= 0) return;
			lock = who;
			dst.scrollTop = (src.scrollTop / srcMax) * dstMax;
			clearTimeout(release);
			release = setTimeout(() => (lock = null), 90);
		};
		const onEditor = () => sync(editor, preview, 'editor');
		const onPreview = () => sync(preview, editor, 'preview');
		editor.addEventListener('scroll', onEditor, { passive: true });
		preview.addEventListener('scroll', onPreview, { passive: true });
		return () => {
			editor.removeEventListener('scroll', onEditor);
			preview.removeEventListener('scroll', onPreview);
		};
	});

	// Whitespace-insensitive search for `target` across an element's text nodes;
	// returns a DOM Range spanning the match (or null).
	function findRangeInElement(container: HTMLElement, target: string): Range | null {
		const want = target.replace(/\s+/g, ' ').trim();
		if (want.length < 2) return null;
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
		let norm = '';
		const map: { node: Node; offset: number }[] = [];
		let prevSpace = true;
		let n: Node | null;
		while ((n = walker.nextNode())) {
			const t = n.nodeValue ?? '';
			for (let i = 0; i < t.length; i++) {
				if (/\s/.test(t[i])) {
					if (prevSpace) continue;
					norm += ' ';
					map.push({ node: n, offset: i });
					prevSpace = true;
				} else {
					norm += t[i];
					map.push({ node: n, offset: i });
					prevSpace = false;
				}
			}
		}
		const idx = norm.indexOf(want);
		if (idx < 0) return null;
		const start = map[idx];
		const end = map[idx + want.length - 1];
		if (!start || !end) return null;
		const range = document.createRange();
		range.setStart(start.node, start.offset);
		range.setEnd(end.node, end.offset + 1);
		return range;
	}

	// Whitespace-insensitive search returning raw start/end offsets in `haystack`.
	function findTextOffsets(haystack: string, needle: string): { start: number; end: number } | null {
		const want = needle.replace(/\s+/g, ' ').trim();
		if (want.length < 2) return null;
		let norm = '';
		const map: number[] = [];
		let prevSpace = true;
		for (let i = 0; i < haystack.length; i++) {
			if (/\s/.test(haystack[i])) {
				if (prevSpace) continue;
				norm += ' ';
				map.push(i);
				prevSpace = true;
			} else {
				norm += haystack[i];
				map.push(i);
				prevSpace = false;
			}
		}
		const idx = norm.indexOf(want);
		if (idx < 0) return null;
		return { start: map[idx], end: map[idx + want.length - 1] + 1 };
	}

	// Mirror a text selection between editor and preview (best-effort text match).
	$effect(() => {
		const editor = document.getElementById('content-input') as HTMLTextAreaElement | null;
		const preview = previewPaneEl;
		if (!editor || !preview) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const highlights = (CSS as any).highlights;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const HL = (window as any).Highlight;
		if (!highlights || !HL) return; // Custom Highlight API unavailable

		let lock: string | null = null;
		let release: ReturnType<typeof setTimeout>;
		const setLock = (w: string) => {
			lock = w;
			clearTimeout(release);
			release = setTimeout(() => (lock = null), 150);
		};
		const clearHi = () => highlights.delete('mirror');
		// Drop markdown syntax so the source selection matches the rendered text.
		const stripMd = (s: string) =>
			s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`~>]/g, '');

		const onEditorSelect = () => {
			if (lock && lock !== 'editor') return;
			const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd);
			const q = stripMd(sel);
			if (q.replace(/\s+/g, ' ').trim().length < 2) {
				clearHi();
				return;
			}
			const range = findRangeInElement(preview, q);
			if (range) {
				setLock('editor');
				highlights.set('mirror', new HL(range));
				(range.startContainer.parentElement as HTMLElement | null)?.scrollIntoView?.({
					block: 'nearest'
				});
			} else {
				clearHi();
			}
		};

		const onPreviewMouseUp = () => {
			const s = document.getSelection();
			if (!s || s.isCollapsed || !preview.contains(s.anchorNode)) return;
			if (s.toString().replace(/\s+/g, ' ').trim().length < 2) return;
			const off = findTextOffsets(editor.value, s.toString());
			if (!off) return;
			setLock('preview');
			if (s.rangeCount) highlights.set('mirror', new HL(s.getRangeAt(0).cloneRange()));
			editor.focus();
			editor.setSelectionRange(off.start, off.end);
			setLock('preview');
		};

		editor.addEventListener('select', onEditorSelect);
		preview.addEventListener('mouseup', onPreviewMouseUp);
		return () => {
			editor.removeEventListener('select', onEditorSelect);
			preview.removeEventListener('mouseup', onPreviewMouseUp);
			clearHi();
		};
	});

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
	// Page indices the user has excluded from printing (survives re-renders).
	const excludedPages = new Set<number>();

	function setExcluded(page: HTMLElement, item: HTMLElement, excluded: boolean) {
		page.classList.toggle('page-excluded', excluded);
		item.classList.toggle('thumb-excluded', excluded);
	}

	function buildMinimap(pagesRoot: HTMLDivElement) {
		if (!minimapEl) return;
		const pages = Array.from(pagesRoot.querySelectorAll('.pagedjs_page')) as HTMLElement[];
		const scale = 104 / layout.pageWidth;
		minimapEl.innerHTML = '';
		pages.forEach((pg, i) => {
			const item = document.createElement('div');
			item.className = 'minimap-item';

			const thumb = document.createElement('button');
			thumb.className = 'minimap-thumb';
			thumb.style.width = `${layout.pageWidth * scale}px`;
			thumb.style.height = `${layout.pageHeight * scale}px`;
			thumb.title = `Page ${i + 1} — click to jump`;

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

			// Include-in-print checkbox (top-left of the thumbnail).
			const cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.className = 'minimap-include';
			cb.checked = !excludedPages.has(i);
			cb.title = 'Include this page in the print';
			cb.onchange = () => {
				if (cb.checked) excludedPages.delete(i);
				else excludedPages.add(i);
				setExcluded(pages[i], item, !cb.checked);
			};

			item.appendChild(thumb);
			item.appendChild(cb);
			minimapEl!.appendChild(item);

			// Re-apply any prior exclusion to the freshly rendered page.
			setExcluded(pages[i], item, excludedPages.has(i));
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

	.minimap :global(.minimap-item) {
		position: relative;
		flex: 0 0 auto;
		line-height: 0;
	}

	.minimap :global(.minimap-thumb) {
		position: relative;
		padding: 0;
		border: 1px solid #cbd5e1;
		background: white;
		cursor: pointer;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		display: block;
	}

	/* Include-in-print checkbox, top-left of each thumbnail. */
	.minimap :global(.minimap-include) {
		position: absolute;
		top: 4px;
		left: 4px;
		margin: 0;
		cursor: pointer;
		z-index: 1;
	}

	/* Excluded pages: dimmed thumbnail with a strike. */
	.minimap :global(.thumb-excluded .minimap-thumb) {
		opacity: 0.35;
	}

	.minimap :global(.thumb-excluded::after) {
		content: 'Excluded';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) rotate(-12deg);
		font: 600 10px sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #dc2626;
		background: rgba(255, 255, 255, 0.9);
		padding: 1px 5px;
		border-radius: 3px;
		pointer-events: none;
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

		/* Pages the user unchecked in the minimap don't print. */
		:global(.pagedjs_page.page-excluded) {
			display: none !important;
		}
	}
</style>
