# Easy Print Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a website that auto-formats reference material (recipes, lyrics, notes, shortcuts) to fit on 1-2 printed pages.

**Architecture:** SvelteKit app with a JS measurement layout engine. Editor view with live print preview on the left, content input on the right. The engine renders content into a page-sized container, measures overflow, and iteratively adjusts margins, columns, and font size until it fits. CSS `@media print` handles actual printing.

**Tech Stack:** SvelteKit, TypeScript, Vitest, marked (markdown parsing), Vercel deployment.

---

### Task 1: Scaffold SvelteKit Project

**Files:**
- Create: project scaffolding via `sv create`
- Modify: `package.json` (add dependencies)

**Step 1: Create SvelteKit project**

Run in `/Users/suki/dev/easy-print`:
```bash
npx sv create . --template minimal --types ts --no-install
```
Select defaults if prompted. Since we're in an existing directory with a docs/ folder, this will scaffold around it.

**Step 2: Install dependencies**

```bash
npm install
npm install marked
npm install -D @types/marked vitest @testing-library/svelte @testing-library/jest-dom jsdom
```

**Step 3: Configure Vitest**

Add test config to `vite.config.ts`:
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
  },
});
```

Create `vitest-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

**Step 4: Verify it runs**

```bash
npm run dev
```
Expected: SvelteKit dev server starts on localhost:5173.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold SvelteKit project with testing setup"
```

---

### Task 2: Markdown Parser Module

**Files:**
- Create: `src/lib/parser.ts`
- Test: `src/lib/parser.test.ts`

**Step 1: Write the failing test**

```ts
// src/lib/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseContent } from './parser';

describe('parseContent', () => {
  it('converts markdown headings to HTML', () => {
    const result = parseContent('# Hello');
    expect(result).toContain('<h1>Hello</h1>');
  });

  it('converts bullet lists to HTML', () => {
    const result = parseContent('- item one\n- item two');
    expect(result).toContain('<li>item one</li>');
    expect(result).toContain('<li>item two</li>');
  });

  it('converts bold and italic', () => {
    const result = parseContent('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('converts horizontal rules', () => {
    const result = parseContent('above\n\n---\n\nbelow');
    expect(result).toContain('<hr');
  });

  it('wraps sections by heading into divs with class "section"', () => {
    const result = parseContent('# Section 1\ntext\n# Section 2\nmore');
    expect(result).toContain('class="section"');
    // Should have 2 sections
    const sectionCount = (result.match(/class="section"/g) || []).length;
    expect(sectionCount).toBe(2);
  });

  it('returns empty string for empty input', () => {
    expect(parseContent('')).toBe('');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/parser.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/parser.ts
import { marked } from 'marked';

/**
 * Parse markdown content into HTML with section wrappers.
 * Each top-level heading starts a new section div.
 */
export function parseContent(input: string): string {
  if (!input.trim()) return '';

  const rawHtml = marked.parse(input, { async: false }) as string;

  // Split HTML at h1/h2 boundaries and wrap each in a section div
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

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/parser.test.ts
```
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/lib/parser.ts src/lib/parser.test.ts
git commit -m "feat: add markdown parser with section wrapping"
```

---

### Task 3: Layout Engine

**Files:**
- Create: `src/lib/layout-engine.ts`
- Test: `src/lib/layout-engine.test.ts`

**Step 1: Write the failing test**

```ts
// src/lib/layout-engine.test.ts
import { describe, it, expect } from 'vitest';
import { computeLayout, type LayoutConfig, type LayoutResult } from './layout-engine';

describe('computeLayout', () => {
  const defaultConfig: LayoutConfig = {
    pageWidth: 816,    // 8.5" at 96dpi
    pageHeight: 1056,  // 11" at 96dpi
    maxPages: 1,
    orientation: 'portrait',
    fontSizeOverride: null,
  };

  it('returns default layout when content fits', () => {
    const result = computeLayout(100, defaultConfig);
    expect(result.fontSize).toBe(16);
    expect(result.columns).toBe(1);
    expect(result.marginPx).toBe(48);
  });

  it('reduces margins first when content overflows', () => {
    const result = computeLayout(1100, defaultConfig);
    expect(result.marginPx).toBeLessThan(48);
  });

  it('adds columns when margin reduction is not enough', () => {
    const result = computeLayout(2500, defaultConfig);
    expect(result.columns).toBeGreaterThan(1);
  });

  it('reduces font size as last resort', () => {
    const result = computeLayout(5000, defaultConfig);
    expect(result.fontSize).toBeLessThan(16);
  });

  it('never goes below minimum font size', () => {
    const result = computeLayout(50000, defaultConfig);
    expect(result.fontSize).toBeGreaterThanOrEqual(9);
  });

  it('respects font size override', () => {
    const config = { ...defaultConfig, fontSizeOverride: 14 as number | null };
    const result = computeLayout(100, config);
    expect(result.fontSize).toBe(14);
  });

  it('doubles available height for 2-page mode', () => {
    const config1 = { ...defaultConfig, maxPages: 1 };
    const config2 = { ...defaultConfig, maxPages: 2 };
    const result1 = computeLayout(2000, config1);
    const result2 = computeLayout(2000, config2);
    // 2-page mode should need fewer adjustments
    expect(result2.fontSize).toBeGreaterThanOrEqual(result1.fontSize);
  });

  it('swaps dimensions for landscape', () => {
    const config = { ...defaultConfig, orientation: 'landscape' as const };
    const result = computeLayout(100, config);
    expect(result.pageWidth).toBe(1056);
    expect(result.pageHeight).toBe(816);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/layout-engine.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/layout-engine.ts

export interface LayoutConfig {
  pageWidth: number;       // px (816 for letter at 96dpi)
  pageHeight: number;      // px (1056 for letter at 96dpi)
  maxPages: number;        // 1 or 2
  orientation: 'portrait' | 'landscape';
  fontSizeOverride: number | null;  // null = auto
}

export interface LayoutResult {
  fontSize: number;
  columns: number;
  marginPx: number;
  pageWidth: number;
  pageHeight: number;
}

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 9;
const DEFAULT_MARGIN = 48;
const MIN_MARGIN = 24;
const MAX_COLUMNS = 3;

/**
 * Given a measured content height (at default settings),
 * compute layout parameters to fit within the target page(s).
 */
export function computeLayout(
  contentHeight: number,
  config: LayoutConfig
): LayoutResult {
  const pageWidth = config.orientation === 'landscape' ? config.pageHeight : config.pageWidth;
  const pageHeight = config.orientation === 'landscape' ? config.pageWidth : config.pageHeight;

  const totalHeight = pageHeight * config.maxPages;

  let fontSize = config.fontSizeOverride ?? DEFAULT_FONT_SIZE;
  let marginPx = DEFAULT_MARGIN;
  let columns = 1;

  const availableHeight = () => (totalHeight - marginPx * 2);
  const effectiveHeight = () => {
    const scale = fontSize / DEFAULT_FONT_SIZE;
    return contentHeight * scale / columns;
  };

  // If font size is overridden, skip auto-sizing of font
  const canAdjustFont = config.fontSizeOverride === null;

  // Step 1: Reduce margins
  while (effectiveHeight() > availableHeight() && marginPx > MIN_MARGIN) {
    marginPx -= 4;
  }

  // Step 2: Add columns
  while (effectiveHeight() > availableHeight() && columns < MAX_COLUMNS) {
    columns += 1;
  }

  // Step 3: Reduce font size (last resort)
  if (canAdjustFont) {
    while (effectiveHeight() > availableHeight() && fontSize > MIN_FONT_SIZE) {
      fontSize -= 0.5;
    }
    fontSize = Math.max(fontSize, MIN_FONT_SIZE);
  }

  return { fontSize, columns, marginPx, pageWidth, pageHeight };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/layout-engine.test.ts
```
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/lib/layout-engine.ts src/lib/layout-engine.test.ts
git commit -m "feat: add layout engine with auto-fit algorithm"
```

---

### Task 4: Theme System

**Files:**
- Create: `src/lib/themes.ts`
- Create: `src/lib/themes/minimal.css`
- Create: `src/lib/themes/modern.css`
- Create: `src/lib/themes/classic.css`

**Step 1: Define theme types and registry**

```ts
// src/lib/themes.ts
export type ThemeName = 'minimal' | 'modern' | 'classic';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  cssClass: string;
}

export const themes: ThemeConfig[] = [
  { name: 'minimal', label: 'Minimal', cssClass: 'theme-minimal' },
  { name: 'modern', label: 'Modern', cssClass: 'theme-modern' },
  { name: 'classic', label: 'Classic', cssClass: 'theme-classic' },
];
```

**Step 2: Create theme CSS files**

`src/lib/themes/minimal.css`:
```css
.theme-minimal {
  --font-body: system-ui, -apple-system, sans-serif;
  --font-heading: system-ui, -apple-system, sans-serif;
  --font-size-base: 14px;
  --font-size-h1: 20px;
  --font-size-h2: 17px;
  --line-height: 1.3;
  --section-gap: 8px;
  --heading-margin: 4px 0;
  --list-padding: 16px;
  --hr-style: 1px solid #999;
  --text-color: #000;
  --bg-color: #fff;
  --accent-color: #333;
  --border-style: none;
}
```

`src/lib/themes/modern.css`:
```css
.theme-modern {
  --font-body: 'Inter', system-ui, sans-serif;
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-size-base: 14px;
  --font-size-h1: 22px;
  --font-size-h2: 18px;
  --line-height: 1.4;
  --section-gap: 12px;
  --heading-margin: 8px 0 4px;
  --list-padding: 20px;
  --hr-style: 2px solid #e2e8f0;
  --text-color: #1a202c;
  --bg-color: #fff;
  --accent-color: #3b82f6;
  --border-style: 1px solid #e2e8f0;
}

.theme-modern .section {
  border-left: 3px solid var(--accent-color);
  padding-left: 12px;
  margin-bottom: var(--section-gap);
}
```

`src/lib/themes/classic.css`:
```css
.theme-classic {
  --font-body: Georgia, 'Times New Roman', serif;
  --font-heading: Georgia, 'Times New Roman', serif;
  --font-size-base: 15px;
  --font-size-h1: 24px;
  --font-size-h2: 19px;
  --line-height: 1.5;
  --section-gap: 16px;
  --heading-margin: 12px 0 6px;
  --list-padding: 24px;
  --hr-style: 1px solid #666;
  --text-color: #222;
  --bg-color: #fff;
  --accent-color: #444;
  --border-style: none;
}
```

**Step 3: Commit**

```bash
git add src/lib/themes.ts src/lib/themes/
git commit -m "feat: add minimal, modern, and classic theme system"
```

---

### Task 5: Page Preview Component

**Files:**
- Create: `src/lib/components/PagePreview.svelte`
- Create: `src/app.css`

This is the core visual component — a div that represents a physical page at scale, showing the formatted content with live layout adjustments.

**Step 1: Create global print/page styles**

```css
/* src/app.css */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
  color: #1a1a1a;
}

/* Page container base styles consumed by theme variables */
.page {
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: var(--font-size-base, 14px);
  line-height: var(--line-height, 1.4);
  color: var(--text-color, #000);
  background: var(--bg-color, #fff);
}

.page h1 {
  font-family: var(--font-heading, inherit);
  font-size: var(--font-size-h1, 22px);
  margin: var(--heading-margin, 8px 0);
}

.page h2 {
  font-family: var(--font-heading, inherit);
  font-size: var(--font-size-h2, 18px);
  margin: var(--heading-margin, 6px 0);
}

.page ul,
.page ol {
  padding-left: var(--list-padding, 20px);
  margin: 4px 0;
}

.page hr {
  border: none;
  border-top: var(--hr-style, 1px solid #ccc);
  margin: 8px 0;
}

.page .section {
  margin-bottom: var(--section-gap, 8px);
}

/* Multi-column layout */
.page-content.columns-2 {
  column-count: 2;
  column-gap: 24px;
}

.page-content.columns-3 {
  column-count: 3;
  column-gap: 16px;
}

.page .section {
  break-inside: avoid;
}

/* Print styles */
@media print {
  body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .no-print {
    display: none !important;
  }

  .page {
    box-shadow: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }
}
```

**Step 2: Create PagePreview component**

```svelte
<!-- src/lib/components/PagePreview.svelte -->
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

  const columnsClass = $derived(
    layout.columns > 1 ? `columns-${layout.columns}` : ''
  );
</script>

<div
  class="page {theme}"
  style={pageStyle}
  bind:this={pageEl}
>
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
```

**Step 3: Commit**

```bash
git add src/app.css src/lib/components/PagePreview.svelte
git commit -m "feat: add PagePreview component and global styles"
```

---

### Task 6: Editor Component

**Files:**
- Create: `src/lib/components/Editor.svelte`

The textarea where users type or paste content.

**Step 1: Create the Editor component**

```svelte
<!-- src/lib/components/Editor.svelte -->
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
```

**Step 2: Commit**

```bash
git add src/lib/components/Editor.svelte
git commit -m "feat: add Editor textarea component"
```

---

### Task 7: Toolbar Component

**Files:**
- Create: `src/lib/components/Toolbar.svelte`

Controls for theme, page target, orientation, paper size, font size override.

**Step 1: Create the Toolbar component**

```svelte
<!-- src/lib/components/Toolbar.svelte -->
<script lang="ts">
  import { themes, type ThemeName } from '$lib/themes';

  interface Props {
    theme: ThemeName;
    maxPages: number;
    orientation: 'portrait' | 'landscape';
    paperSize: 'letter' | 'a4';
    fontSizeOverride: string;
    onthemechange: (theme: ThemeName) => void;
    onpageschange: (pages: number) => void;
    onorientationchange: (orientation: 'portrait' | 'landscape') => void;
    onpapersizechange: (size: 'letter' | 'a4') => void;
    onfontsizechange: (size: string) => void;
    onprint: () => void;
  }

  let {
    theme,
    maxPages,
    orientation,
    paperSize,
    fontSizeOverride,
    onthemechange,
    onpageschange,
    onorientationchange,
    onpapersizechange,
    onfontsizechange,
    onprint,
  }: Props = $props();
</script>

<div class="toolbar no-print">
  <div class="toolbar-group">
    <label class="toolbar-label">Theme</label>
    <select value={theme} onchange={(e) => onthemechange((e.target as HTMLSelectElement).value as ThemeName)}>
      {#each themes as t}
        <option value={t.name}>{t.label}</option>
      {/each}
    </select>
  </div>

  <div class="toolbar-group">
    <label class="toolbar-label">Pages</label>
    <select value={maxPages} onchange={(e) => onpageschange(Number((e.target as HTMLSelectElement).value))}>
      <option value={1}>1 page</option>
      <option value={2}>2 pages</option>
    </select>
  </div>

  <div class="toolbar-group">
    <label class="toolbar-label">Orientation</label>
    <select value={orientation} onchange={(e) => onorientationchange((e.target as HTMLSelectElement).value as 'portrait' | 'landscape')}>
      <option value="portrait">Portrait</option>
      <option value="landscape">Landscape</option>
    </select>
  </div>

  <div class="toolbar-group">
    <label class="toolbar-label">Paper</label>
    <select value={paperSize} onchange={(e) => onpapersizechange((e.target as HTMLSelectElement).value as 'letter' | 'a4')}>
      <option value="letter">Letter</option>
      <option value="a4">A4</option>
    </select>
  </div>

  <div class="toolbar-group">
    <label class="toolbar-label">Font Size</label>
    <select value={fontSizeOverride} onchange={(e) => onfontsizechange((e.target as HTMLSelectElement).value)}>
      <option value="auto">Auto</option>
      <option value="small">Small</option>
      <option value="medium">Medium</option>
      <option value="large">Large</option>
    </select>
  </div>

  <button class="print-button" onclick={onprint}>
    Print
  </button>
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
```

**Step 2: Commit**

```bash
git add src/lib/components/Toolbar.svelte
git commit -m "feat: add Toolbar component with layout controls"
```

---

### Task 8: Main Page — Wire Everything Together

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/+layout.svelte`

**Step 1: Set up the root layout**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  import '../lib/themes/minimal.css';
  import '../lib/themes/modern.css';
  import '../lib/themes/classic.css';
</script>

<slot />
```

**Step 2: Build the main page**

```svelte
<!-- src/routes/+page.svelte -->
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

  // We need to measure content height in the preview to feed the layout engine.
  // For now, estimate based on character count and line count as a starting heuristic.
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

  let themeClass = $derived(
    themes.find((t) => t.name === theme)?.cssClass ?? 'theme-modern'
  );

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
    /* Scale preview to fit pane — will be dynamic in Task 9 */
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
```

**Step 3: Verify it runs**

```bash
npm run dev
```
Expected: App loads at localhost:5173. Typing in the left pane shows formatted content in the right pane preview.

**Step 4: Commit**

```bash
git add src/routes/+page.svelte src/routes/+layout.svelte
git commit -m "feat: wire up main page with editor, preview, and toolbar"
```

---

### Task 9: DOM-Based Content Measurement

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/PagePreview.svelte`

Replace the character-count height estimate with actual DOM measurement. The PagePreview component measures its content div's scrollHeight and reports it back to the parent, which feeds it to the layout engine.

**Step 1: Update PagePreview to report measured height**

Add an `onmeasure` callback prop to PagePreview. After the HTML renders, use `$effect` to measure `scrollHeight` of the content div and call `onmeasure(height)`.

```svelte
<!-- Updated PagePreview.svelte -->
<script lang="ts">
  import type { LayoutResult } from '$lib/layout-engine';

  interface Props {
    html: string;
    layout: LayoutResult;
    theme: string;
    onmeasure?: (height: number) => void;
  }

  let { html, layout, theme, onmeasure }: Props = $props();

  let contentEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (contentEl && onmeasure && html) {
      // Measure at default single-column, default font size to get raw content height
      onmeasure(contentEl.scrollHeight);
    }
  });

  const pageStyle = $derived(
    `width: ${layout.pageWidth}px; min-height: ${layout.pageHeight}px; padding: ${layout.marginPx}px; font-size: ${layout.fontSize}px;`
  );

  const columnsClass = $derived(
    layout.columns > 1 ? `columns-${layout.columns}` : ''
  );
</script>

<div
  class="page {theme}"
  style={pageStyle}
>
  <div class="page-content {columnsClass}" bind:this={contentEl}>
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
```

**Step 2: Update +page.svelte to use measured height**

Replace `estimatedHeight` with a `measuredHeight` state variable. Pass `onmeasure` to PagePreview. Feed `measuredHeight` to `computeLayout`.

Replace the `estimatedHeight` derived block with:
```ts
let measuredHeight = $state(0);
```

And update the `computeLayout` call to use `measuredHeight` instead of `estimatedHeight`.

Pass `onmeasure={(h) => (measuredHeight = h)}` to PagePreview.

**Step 3: Verify it works**

```bash
npm run dev
```
Expected: Paste a large block of text — preview should auto-adjust columns/font to fit the page.

**Step 4: Commit**

```bash
git add src/lib/components/PagePreview.svelte src/routes/+page.svelte
git commit -m "feat: add DOM-based content measurement for accurate layout"
```

---

### Task 10: Auto-Scale Preview to Fit Pane

**Files:**
- Modify: `src/routes/+page.svelte`

The preview pane should scale the page preview to fit the available width so users always see the full page without scrolling horizontally.

**Step 1: Add resize observer to preview pane**

Use a `$effect` with a `ResizeObserver` on the preview pane div. Calculate scale as `paneWidth / layout.pageWidth` (capped at 1.0). Apply as `transform: scale(factor)` on the preview scroll container.

**Step 2: Verify**

```bash
npm run dev
```
Expected: Resize the browser — preview page scales to fit. Never exceeds 100% scale.

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: auto-scale preview to fit available pane width"
```

---

### Task 11: Final Polish & Deploy

**Files:**
- Modify: `src/app.css` (minor tweaks)
- Modify: various components (polish)

**Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass.

**Step 2: Build for production**

```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 3: Test production build locally**

```bash
npm run preview
```
Expected: App works correctly at localhost:4173.

**Step 4: Deploy to Vercel**

```bash
vercel
```
Expected: Deploys successfully, returns a URL.

**Step 5: Commit any final changes**

```bash
git add -A
git commit -m "chore: production build polish and deploy config"
```
