<script lang="ts">
	import {
		loadHistory,
		addHistory,
		removeHistory,
		clearHistory,
		type HistoryEntry,
	} from '$lib/history';

	interface Props {
		value: string;
		onchange: (value: string) => void;
		onimport?: (markdown: string) => void;
	}

	let { value, onchange, onimport }: Props = $props();

	let textareaEl: HTMLTextAreaElement | undefined = $state();

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		onchange(target.value);
	}

	// Insert a [newpage] marker at the cursor (or end), padded by blank lines.
	function insertPageBreak() {
		const marker = '\n\n[newpage]\n\n';
		const el = textareaEl;
		const pos = el ? el.selectionStart : value.length;
		const next = value.slice(0, pos) + marker + value.slice(pos);
		onchange(next);
		if (el) {
			const caret = pos + marker.length;
			// Restore focus + caret after Svelte updates the value.
			requestAnimationFrame(() => {
				el.focus();
				el.setSelectionRange(caret, caret);
			});
		}
	}

	// --- URL import ---
	let url = $state('');
	let loading = $state(false);
	let errorMsg = $state('');
	let stripImages = $state(true);

	// --- Import history (localStorage) ---
	let history = $state<HistoryEntry[]>([]);
	// Runs only in the browser (effects don't run during SSR).
	$effect(() => {
		history = loadHistory();
	});

	async function fetchUrl() {
		if (!url.trim() || loading) return;
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/fetch-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url, stripImages }),
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data?.message ?? `Failed (${res.status})`;
				return;
			}
			onchange(data.markdown);
			onimport?.(data.markdown);
			history = addHistory({
				url: url.trim(),
				title: (data.title ?? '').trim() || url.trim(),
				markdown: data.markdown,
			});
		} catch {
			errorMsg = 'Network error — could not fetch that URL';
		} finally {
			loading = false;
		}
	}

	function handleUrlKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			fetchUrl();
		}
	}

	function openEntry(entry: HistoryEntry) {
		url = entry.url;
		onchange(entry.markdown);
		onimport?.(entry.markdown);
	}

	function deleteEntry(e: MouseEvent, id: string) {
		e.stopPropagation();
		history = removeHistory(id);
	}
</script>

<div class="editor">
	<div class="url-bar">
		<input
			class="url-input"
			type="url"
			placeholder="Paste a URL to import an article…"
			bind:value={url}
			onkeydown={handleUrlKeydown}
			disabled={loading}
			spellcheck="false"
		/>
		<button class="url-button" onclick={fetchUrl} disabled={loading || !url.trim()}>
			{loading ? 'Fetching…' : 'Import'}
		</button>
	</div>
	<label class="url-option">
		<input type="checkbox" bind:checked={stripImages} disabled={loading} />
		Strip images on import
	</label>
	{#if errorMsg}
		<p class="url-error">{errorMsg}</p>
	{/if}

	{#if history.length > 0}
		<div class="recent">
			<div class="recent-head">
				<span class="recent-title">Recent imports</span>
				<button class="recent-clear" onclick={() => (history = clearHistory())}>Clear</button>
			</div>
			<ul class="recent-list">
				{#each history as entry (entry.id)}
					<li>
						<button class="recent-item" onclick={() => openEntry(entry)} title={entry.url}>
							<span class="recent-item-title">{entry.title}</span>
							<span class="recent-item-url">{entry.url}</span>
						</button>
						<button
							class="recent-remove"
							onclick={(e) => deleteEntry(e, entry.id)}
							title="Remove"
							aria-label="Remove">×</button
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="editor-head">
		<label for="content-input" class="editor-label">Content (Markdown)</label>
		<button class="insert-break" onclick={insertPageBreak}>+ Page break</button>
	</div>
	<textarea
		id="content-input"
		class="editor-textarea"
		bind:this={textareaEl}
		{value}
		oninput={handleInput}
		placeholder={"# My Reference Sheet\n\nPaste or type your content here...\n\n## Section\n- Use **bold** and *italic*\n- Use headings to create sections\n- Use --- for dividers\n- Use [newpage] to force a new page"}
		spellcheck="false"
	></textarea>
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.url-bar {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
	}

	.url-input {
		flex: 1;
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 13px;
		outline: none;
		transition: border-color 0.15s;
	}

	.url-input:focus {
		border-color: #3b82f6;
	}

	.url-button {
		padding: 8px 16px;
		background: #1a1a1a;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.url-button:hover:not(:disabled) {
		background: #333;
	}

	.url-button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.url-option {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 12px;
		font-size: 12px;
		color: #666;
		cursor: pointer;
		user-select: none;
	}

	.url-error {
		margin: 0 0 12px;
		font-size: 12px;
		color: #dc2626;
	}

	.recent {
		margin-bottom: 16px;
	}

	.recent-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.recent-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #888;
	}

	.recent-clear {
		background: none;
		border: none;
		padding: 0;
		font-size: 11px;
		color: #999;
		cursor: pointer;
	}

	.recent-clear:hover {
		color: #dc2626;
	}

	.recent-list {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 160px;
		overflow-y: auto;
		border: 1px solid #eee;
		border-radius: 6px;
	}

	.recent-list li {
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid #f1f1f1;
	}

	.recent-list li:last-child {
		border-bottom: none;
	}

	.recent-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 7px 10px;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		min-width: 0;
	}

	.recent-item:hover {
		background: #f7f7f7;
	}

	.recent-item-title {
		font-size: 13px;
		color: #1a1a1a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.recent-item-url {
		font-size: 11px;
		color: #aaa;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.recent-remove {
		flex: 0 0 auto;
		width: 28px;
		background: none;
		border: none;
		color: #ccc;
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
	}

	.recent-remove:hover {
		color: #dc2626;
	}

	.editor-label {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
		margin-bottom: 8px;
	}

	.editor-textarea {
		flex: 1;
		resize: none;
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 16px;
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 14px;
		line-height: 1.5;
		color: #1a1a1a;
		background: #fafafa;
		outline: none;
		transition: border-color 0.15s;
	}

	.editor-textarea:focus {
		border-color: #3b82f6;
	}

	.editor-textarea::placeholder {
		color: #aaa;
	}
</style>
