<script lang="ts">
	import type { LayoutResult } from '$lib/layout-engine';

	interface Props {
		html: string;
		layout: LayoutResult;
		theme: string;
		// @page rules (size, margins, running header/footer) built by the parent.
		pageCss: string;
		// Called after each (re)pagination with the element holding the pages,
		// so the parent can build the page-thumbnail minimap.
		onrender?: (root: HTMLDivElement) => void;
	}

	let { html, layout, theme, pageCss, onrender }: Props = $props();

	let root: HTMLDivElement | undefined = $state();
	let rendering = $state(false);
	let failed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Concurrency control: renders share head-injected styles + the root node, so
	// they MUST NOT overlap (overlap collapses everything onto one page). Serialize.
	let busy = false;
	let rerun = false;

	async function doRender() {
		if (!root) return;
		if (!html.trim()) {
			root.innerHTML = '';
			return;
		}
		rendering = true;
		failed = false;
		let offscreen: HTMLDivElement | undefined;
		try {
			const { Previewer } = await import('pagedjs');
			const wrapped = `<div class="${theme}" style="font-size:${layout.fontSize}px"><div class="page-content">${html}</div></div>`;
			const blob = new Blob([pageCss], { type: 'text/css' });
			const url = URL.createObjectURL(blob);
			// Paged.js injects a data-pagedjs-inserted-styles stylesheet into the
			// document head on every run; stale ones accumulate and break
			// re-pagination (content collapses onto one overflowing page). Remove
			// them before re-rendering.
			document
				.querySelectorAll('style[data-pagedjs-inserted-styles]')
				.forEach((s) => s.remove());
			// Render OFF-SCREEN at scale 1. Paged.js measures overflow with
			// getBoundingClientRect; doing it inside the scaled preview pane makes
			// content look short, so it stops after one overflowing page. An
			// unscaled, document-body-attached node measures correctly.
			offscreen = document.createElement('div');
			offscreen.style.cssText = 'position:absolute;left:-99999px;top:0;';
			document.body.appendChild(offscreen);
			await new Previewer().preview(wrapped, [url], offscreen);
			URL.revokeObjectURL(url);
			// Move the finished pages into the visible (scaled) display node.
			root.innerHTML = '';
			const pagesEl = offscreen.querySelector('.pagedjs_pages');
			if (pagesEl) root.appendChild(pagesEl);
			onrender?.(root);
		} catch (e) {
			console.error('Paged.js render failed', e);
			failed = true;
		} finally {
			offscreen?.remove();
			rendering = false;
		}
	}

	// Run renders one at a time; if changes arrive mid-render, re-run once more
	// afterwards with the latest state.
	async function render() {
		if (busy) {
			rerun = true;
			return;
		}
		busy = true;
		try {
			do {
				rerun = false;
				await doRender();
			} while (rerun);
		} finally {
			busy = false;
		}
	}

	// Re-paginate (debounced) whenever content, styling or @page rules change.
	$effect(() => {
		void html;
		void layout;
		void theme;
		void pageCss;
		if (timer) clearTimeout(timer);
		timer = setTimeout(render, 300);
		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

<div class="paged-root" bind:this={root}></div>

{#if rendering}
	<div class="paged-status no-print">Formatting…</div>
{/if}
{#if failed}
	<div class="paged-status paged-error no-print">Could not format this content.</div>
{/if}

<style>
	.paged-root {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
	}

	/* Paged.js renders .pagedjs_page boxes; give them a sheet look on screen. */
	.paged-root :global(.pagedjs_page) {
		background: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		margin: 0;
	}

	.paged-status {
		text-align: center;
		color: #888;
		font-size: 13px;
		padding: 8px;
	}

	.paged-error {
		color: #dc2626;
	}

	@media print {
		.paged-root {
			display: block;
			gap: 0;
		}

		.paged-root :global(.pagedjs_page) {
			box-shadow: none;
		}
	}
</style>
