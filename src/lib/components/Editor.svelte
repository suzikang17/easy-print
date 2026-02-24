<script lang="ts">
	interface Props {
		value: string;
		onchange: (value: string) => void;
	}

	let { value, onchange }: Props = $props();

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		onchange(target.value);
	}
</script>

<div class="editor">
	<label for="content-input" class="editor-label">Content (Markdown)</label>
	<textarea
		id="content-input"
		class="editor-textarea"
		{value}
		oninput={handleInput}
		placeholder={"# My Reference Sheet\n\nPaste or type your content here...\n\n## Section\n- Use **bold** and *italic*\n- Use headings to create sections\n- Use --- for dividers"}
		spellcheck="false"
	></textarea>
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		height: 100%;
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
