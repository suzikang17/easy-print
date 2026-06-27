<script lang="ts">
	import { themes, type ThemeName } from '$lib/themes';
	import { templates, blogStyles, type TemplateName, type BlogStyle } from '$lib/templates';

	interface Props {
		theme: ThemeName;
		template: TemplateName;
		blogStyle: BlogStyle;
		maxPages: number;
		orientation: 'portrait' | 'landscape';
		fontSizeOverride: string;
		onthemechange: (theme: ThemeName) => void;
		ontemplatechange: (template: TemplateName) => void;
		onblogstylechange: (style: BlogStyle) => void;
		onpageschange: (pages: number) => void;
		onorientationchange: (orientation: 'portrait' | 'landscape') => void;
		onfontsizechange: (size: string) => void;
		onprint: () => void;
	}

	let {
		theme,
		template,
		blogStyle,
		maxPages,
		orientation,
		fontSizeOverride,
		onthemechange,
		ontemplatechange,
		onblogstylechange,
		onpageschange,
		onorientationchange,
		onfontsizechange,
		onprint,
	}: Props = $props();
</script>

<div class="toolbar no-print">
	<label class="toolbar-group">
		<span class="toolbar-label">Theme</span>
		<select
			value={theme}
			onchange={(e) => onthemechange((e.target as HTMLSelectElement).value as ThemeName)}
		>
			{#each themes as t}
				<option value={t.name}>{t.label}</option>
			{/each}
		</select>
	</label>

	<label class="toolbar-group">
		<span class="toolbar-label">Template</span>
		<select
			value={template}
			onchange={(e) => ontemplatechange((e.target as HTMLSelectElement).value as TemplateName)}
		>
			<option value="none">None</option>
			{#each templates as t}
				<option value={t.name}>{t.label}</option>
			{/each}
		</select>
	</label>

	{#if template === 'blogpost'}
		<label class="toolbar-group">
			<span class="toolbar-label">Style</span>
			<select
				value={blogStyle}
				onchange={(e) => onblogstylechange((e.target as HTMLSelectElement).value as BlogStyle)}
			>
				{#each blogStyles as s}
					<option value={s.name}>{s.label}</option>
				{/each}
			</select>
		</label>
	{/if}

	<label class="toolbar-group">
		<span class="toolbar-label">Pages</span>
		<select
			value={maxPages}
			onchange={(e) => onpageschange(Number((e.target as HTMLSelectElement).value))}
		>
			<option value={1}>1 page</option>
			<option value={2}>2 pages</option>
			<option value={0}>Fit to content</option>
		</select>
	</label>

	<label class="toolbar-group">
		<span class="toolbar-label">Orientation</span>
		<select
			value={orientation}
			onchange={(e) =>
				onorientationchange(
					(e.target as HTMLSelectElement).value as 'portrait' | 'landscape'
				)}
		>
			<option value="portrait">Portrait</option>
			<option value="landscape">Landscape</option>
		</select>
	</label>

	<label class="toolbar-group">
		<span class="toolbar-label">Font Size</span>
		<select
			value={fontSizeOverride}
			onchange={(e) => onfontsizechange((e.target as HTMLSelectElement).value)}
		>
			<option value="auto">Auto</option>
			<option value="small">Small</option>
			<option value="medium">Medium</option>
			<option value="large">Large</option>
		</select>
	</label>

	<button class="print-button" onclick={onprint}> Print </button>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: end;
		gap: 16px;
		padding: 12px 16px;
		background: white;
		border-bottom: 1px solid #e2e8f0;
		flex-wrap: wrap;
	}

	.toolbar-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.toolbar-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #888;
	}

	select {
		padding: 6px 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 13px;
		background: white;
		cursor: pointer;
	}

	.print-button {
		margin-left: auto;
		padding: 8px 24px;
		background: #1a1a1a;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.print-button:hover {
		background: #333;
	}
</style>
