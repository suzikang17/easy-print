# Templates System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an extensible template system with Lyrics and Recipe templates that auto-format pasted content and apply print-optimized CSS styling.

**Architecture:** Templates are separate from themes. Each template is a module exporting `detect()` and `transform()` functions plus a CSS file. A registry in `src/lib/templates/index.ts` mirrors the pattern from `src/lib/themes.ts`. The parser pipeline becomes: raw input → bullet normalization → template transform → marked parse → section wrapping. Template CSS classes layer on top of theme classes on the `.page` element.

**Tech Stack:** SvelteKit, TypeScript, Vitest, marked.

---

### Task 1: Template Registry and Interface

**Files:**
- Create: `src/lib/templates/index.ts`

**Step 1: Create the template registry**

```ts
// src/lib/templates/index.ts
export interface Template {
	name: string;
	label: string;
	cssClass: string;
	detect: (input: string) => boolean;
	transform: (input: string) => string;
}

export type TemplateName = 'none' | 'lyrics' | 'recipe';

export const templates: Template[] = [];

export function getTemplate(name: TemplateName): Template | undefined {
	return templates.find((t) => t.name === name);
}
```

**Step 2: Update parser to accept an optional template transform**

Modify `src/lib/parser.ts`. The `parseContent` function gets an optional second argument — a transform function from the active template. The pipeline becomes: normalize bullets → template transform → marked parse → section wrap.

Replace the current `parseContent` function:

```ts
import { marked } from 'marked';

function normalizeBullets(input: string): string {
	return input.replace(/^(\s*)[■▪▸▹►▻●○◦◽◾•–—→»‣⁃∙]/gm, '$1-');
}

export function parseContent(
	input: string,
	transform?: (input: string) => string
): string {
	if (!input.trim()) return '';

	let processed = normalizeBullets(input);
	if (transform) {
		processed = transform(processed);
	}

	const rawHtml = marked.parse(processed, { async: false, breaks: true }) as string;

	const sections = rawHtml.split(/(?=<h[12][\s>])/);

	if (sections.length <= 1) {
		return rawHtml;
	}

	return sections
		.filter((s) => s.trim())
		.map((s) => `<div class="section">${s}</div>`)
		.join('\n');
}
```

**Step 3: Run existing tests to make sure nothing breaks**

```bash
npx vitest run
```
Expected: All existing tests PASS (the new optional param doesn't break existing calls).

**Step 4: Commit**

```bash
git add src/lib/templates/index.ts src/lib/parser.ts
git commit -m "feat: add template registry and transform hook in parser"
```

---

### Task 2: Lyrics Template

**Files:**
- Create: `src/lib/templates/lyrics.ts`
- Create: `src/lib/templates/lyrics.css`
- Test: `src/lib/templates/lyrics.test.ts`
- Modify: `src/lib/templates/index.ts`

**Step 1: Write failing tests**

```ts
// src/lib/templates/lyrics.test.ts
import { describe, it, expect } from 'vitest';
import { lyricsTemplate } from './lyrics';

describe('lyricsTemplate.detect', () => {
	it('detects [Verse] markers', () => {
		expect(lyricsTemplate.detect('[Verse 1]\nSome lyrics here')).toBe(true);
	});

	it('detects [Chorus] markers', () => {
		expect(lyricsTemplate.detect('[Chorus]\nLa la la')).toBe(true);
	});

	it('detects [Bridge] markers', () => {
		expect(lyricsTemplate.detect('[Bridge]\nOoh')).toBe(true);
	});

	it('does not detect plain text', () => {
		expect(lyricsTemplate.detect('Just some regular text')).toBe(false);
	});

	it('does not detect recipe content', () => {
		expect(lyricsTemplate.detect('Ingredients\n- 1 cup flour')).toBe(false);
	});
});

describe('lyricsTemplate.transform', () => {
	it('converts [Verse 1] to ## Verse 1', () => {
		const result = lyricsTemplate.transform('[Verse 1]\nLine one\nLine two');
		expect(result).toContain('## Verse 1');
	});

	it('converts [Chorus] to ## Chorus', () => {
		const result = lyricsTemplate.transform('[Chorus]\nLa la la');
		expect(result).toContain('## Chorus');
	});

	it('converts [Bridge] to ## Bridge', () => {
		const result = lyricsTemplate.transform('[Bridge]\nOoh');
		expect(result).toContain('## Bridge');
	});

	it('converts [Intro] and [Outro]', () => {
		const input = '[Intro]\nGuitar\n\n[Outro]\nFade out';
		const result = lyricsTemplate.transform(input);
		expect(result).toContain('## Intro');
		expect(result).toContain('## Outro');
	});

	it('preserves lines without markers', () => {
		const result = lyricsTemplate.transform('[Verse 1]\nLine one\nLine two');
		expect(result).toContain('Line one');
		expect(result).toContain('Line two');
	});

	it('passes through text with no markers unchanged', () => {
		const input = 'Just some plain lyrics\nWith line breaks';
		expect(lyricsTemplate.transform(input)).toBe(input);
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/templates/lyrics.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write the lyrics template**

```ts
// src/lib/templates/lyrics.ts
import type { Template } from './index';

const SECTION_PATTERN = /^\[(Verse\s*\d*|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain|Interlude)\]/im;

export const lyricsTemplate: Template = {
	name: 'lyrics',
	label: 'Lyrics',
	cssClass: 'template-lyrics',

	detect(input: string): boolean {
		return SECTION_PATTERN.test(input);
	},

	transform(input: string): string {
		// Convert [Section] markers to ## headings
		return input.replace(
			/^\[(Verse\s*\d*|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain|Interlude)\]\s*/gim,
			(_, section) => `## ${section}\n`
		);
	},
};
```

**Step 4: Register in index**

Add to `src/lib/templates/index.ts`:

```ts
import { lyricsTemplate } from './lyrics';

// ... existing code ...

export const templates: Template[] = [lyricsTemplate];
```

**Step 5: Run tests**

```bash
npx vitest run src/lib/templates/lyrics.test.ts
```
Expected: All tests PASS.

**Step 6: Create lyrics CSS**

```css
/* src/lib/templates/lyrics.css */
.template-lyrics {
	--font-size-h2: 14px;
	--heading-margin: 12px 0 2px;
	--section-gap: 4px;
	--line-height: 1.35;
}

.template-lyrics h2 {
	font-weight: 600;
	font-style: italic;
	opacity: 0.6;
	text-transform: uppercase;
	font-size: 11px;
	letter-spacing: 0.05em;
}

.template-lyrics .section {
	margin-bottom: 12px;
}
```

**Step 7: Commit**

```bash
git add src/lib/templates/
git commit -m "feat: add lyrics template with section detection and transform"
```

---

### Task 3: Recipe Template

**Files:**
- Create: `src/lib/templates/recipe.ts`
- Create: `src/lib/templates/recipe.css`
- Test: `src/lib/templates/recipe.test.ts`
- Modify: `src/lib/templates/index.ts`

**Step 1: Write failing tests**

```ts
// src/lib/templates/recipe.test.ts
import { describe, it, expect } from 'vitest';
import { recipeTemplate } from './recipe';

describe('recipeTemplate.detect', () => {
	it('detects Ingredients keyword', () => {
		expect(recipeTemplate.detect('Ingredients\n- 1 cup flour')).toBe(true);
	});

	it('detects Instructions keyword', () => {
		expect(recipeTemplate.detect('Instructions\n1. Preheat oven')).toBe(true);
	});

	it('detects Directions keyword', () => {
		expect(recipeTemplate.detect('Directions\n1. Mix flour')).toBe(true);
	});

	it('does not detect plain text', () => {
		expect(recipeTemplate.detect('Just some regular text')).toBe(false);
	});

	it('does not detect lyrics', () => {
		expect(recipeTemplate.detect('[Verse 1]\nSinging')).toBe(false);
	});
});

describe('recipeTemplate.transform', () => {
	it('converts Ingredients to ## Ingredients', () => {
		const result = recipeTemplate.transform('Ingredients\n- 1 cup flour');
		expect(result).toContain('## Ingredients');
	});

	it('converts Instructions to ## Instructions', () => {
		const result = recipeTemplate.transform('Instructions\n1. Preheat oven');
		expect(result).toContain('## Instructions');
	});

	it('converts Directions to ## Directions', () => {
		const result = recipeTemplate.transform('Directions\n1. Mix');
		expect(result).toContain('## Directions');
	});

	it('converts Notes to ## Notes', () => {
		const result = recipeTemplate.transform('Notes\nServe warm');
		expect(result).toContain('## Notes');
	});

	it('converts Prep time / Cook time / Servings lines', () => {
		const input = 'Prep time: 10 min\nCook time: 30 min\nServings: 4';
		const result = recipeTemplate.transform(input);
		expect(result).toContain('**Prep time:**');
		expect(result).toContain('**Cook time:**');
		expect(result).toContain('**Servings:**');
	});

	it('passes through text with no recipe keywords unchanged', () => {
		const input = 'Just some plain text';
		expect(recipeTemplate.transform(input)).toBe(input);
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/templates/recipe.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write the recipe template**

```ts
// src/lib/templates/recipe.ts
import type { Template } from './index';

const SECTION_KEYWORDS = /^(Ingredients|Instructions|Directions|Method|Steps|Preparation|Notes|Tips)\s*$/im;
const META_PATTERN = /^(Prep\s*time|Cook\s*time|Total\s*time|Servings|Serves|Yield)\s*[:：]\s*(.+)$/gim;

export const recipeTemplate: Template = {
	name: 'recipe',
	label: 'Recipe',
	cssClass: 'template-recipe',

	detect(input: string): boolean {
		return SECTION_KEYWORDS.test(input);
	},

	transform(input: string): string {
		let result = input;

		// Convert section keywords to ## headings
		result = result.replace(
			/^(Ingredients|Instructions|Directions|Method|Steps|Preparation|Notes|Tips)\s*$/gim,
			(_, section) => `## ${section}`
		);

		// Bold-ify metadata lines (prep time, cook time, servings)
		result = result.replace(
			META_PATTERN,
			(_, label, value) => `**${label}:** ${value.trim()}`
		);

		return result;
	},
};
```

**Step 4: Register in index**

Update `src/lib/templates/index.ts` to add the recipe template:

```ts
import { lyricsTemplate } from './lyrics';
import { recipeTemplate } from './recipe';

// ... existing code ...

export const templates: Template[] = [lyricsTemplate, recipeTemplate];
```

**Step 5: Run tests**

```bash
npx vitest run src/lib/templates/recipe.test.ts
```
Expected: All tests PASS.

**Step 6: Create recipe CSS**

```css
/* src/lib/templates/recipe.css */
.template-recipe {
	--font-size-h2: 16px;
	--heading-margin: 14px 0 4px;
	--section-gap: 10px;
	--line-height: 1.4;
}

.template-recipe h2 {
	font-weight: 700;
	border-bottom: 1px solid #ddd;
	padding-bottom: 2px;
}

.template-recipe ul {
	list-style-type: disc;
}

.template-recipe ol {
	list-style-type: decimal;
}

.template-recipe .section {
	margin-bottom: 12px;
}
```

**Step 7: Commit**

```bash
git add src/lib/templates/
git commit -m "feat: add recipe template with section detection and transform"
```

---

### Task 4: Wire Templates into UI

**Files:**
- Modify: `src/lib/components/Toolbar.svelte`
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/components/PagePreview.svelte`

**Step 1: Add template dropdown to Toolbar**

Add new props to `src/lib/components/Toolbar.svelte`:

In the Props interface, add:
```ts
template: TemplateName;
ontemplatechange: (template: TemplateName) => void;
```

Add import:
```ts
import { templates, type TemplateName } from '$lib/templates';
```

Add to the destructured props:
```ts
template, ontemplatechange,
```

Add a new `<label class="toolbar-group">` block right after the Theme group:

```svelte
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
```

**Step 2: Add template state to +page.svelte**

Add import:
```ts
import { getTemplate, type TemplateName } from '$lib/templates';
```

Add state:
```ts
let template: TemplateName = $state('none');
```

Add derived for the active template:
```ts
let activeTemplate = $derived(getTemplate(template));
```

Update the `html` derived to pass the template transform:
```ts
let html = $derived(parseContent(content, activeTemplate?.transform));
```

Add derived for the template CSS class:
```ts
let templateClass = $derived(activeTemplate?.cssClass ?? '');
```

Pass `template` and `ontemplatechange` to Toolbar:
```ts
template={template}
ontemplatechange={(t) => (template = t)}
```

Update PagePreview to include the template class. Change the `theme` prop value:
```ts
theme="{themeClass} {templateClass}"
```

**Step 3: Import template CSS in +layout.svelte**

Add to `src/routes/+layout.svelte`:
```ts
import '../lib/templates/lyrics.css';
import '../lib/templates/recipe.css';
```

**Step 4: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS.

**Step 5: Verify the dev server**

```bash
npm run dev
```
Expected: App loads. Template dropdown appears in toolbar. Selecting "Lyrics" or "Recipe" and pasting content shows transformed + styled output.

**Step 6: Commit**

```bash
git add src/lib/components/Toolbar.svelte src/routes/+page.svelte src/routes/+layout.svelte
git commit -m "feat: wire template system into toolbar, parser, and preview"
```

---

### Task 5: Build, Test, and Deploy

**Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS.

**Step 2: Build for production**

```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 3: Push to deploy**

```bash
git push origin main
```
Expected: Vercel auto-deploys from main.

**Step 4: Commit any final changes**

```bash
git add -A
git commit -m "chore: templates system polish"
```
