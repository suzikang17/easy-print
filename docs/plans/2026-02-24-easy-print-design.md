# Easy Print — Design Document

A website that auto-formats reference material to fit on 1-2 printed pages.

## Problem

Printing reference material (recipes, lyrics, notes, keyboard shortcuts) from the web or your own notes usually results in wasted pages, bad formatting, or content that doesn't fit. Easy Print solves this by intelligently laying out content to fit exactly 1-2 pages.

## Core Approach: JS Measurement + CSS Print

The layout engine renders content into a page-sized container, measures overflow, and iteratively adjusts parameters (margins, columns, font size) until the content fits. CSS `@media print` handles the actual print output.

This approach was chosen over CSS-only (can't guarantee fit) and server-side PDF (overkill, slow feedback loop).

## Architecture

**Stack:** SvelteKit, deployed to Vercel.

**Two main views:**

1. **Editor view** — left panel with textarea for input, right panel with live print preview
2. **Print view** — clean print-optimized layout via browser print dialog

**No database, no auth.** Everything is client-side for MVP.

## Layout Engine

Renders content into a fixed-size container representing a physical page (8.5" x 11" at 96dpi = 816px x 1056px).

When content overflows, adjusts parameters in this order:
1. Reduce margins
2. Add columns (up to 2-3)
3. Reduce font size (minimum ~9px)

Stops when content fits on target page count (1 or 2). Content sections (defined by headings) are the unit of column flow — a recipe with "Ingredients" and "Instructions" naturally lands in two columns.

## Input (MVP)

Plain textarea with markdown-ish formatting:
- `# Heading` / `## Subheading` for sections
- `- item` for bullet lists
- `---` for horizontal dividers
- `**bold**` / `*italic*`

Sections (defined by headings) are the key layout unit for column flow.

**Future inputs (not MVP):**
- URL import (fetch + extract readable content)
- Templates (pre-structured forms for recipes, cheat sheets, etc.)

## Themes

Three themes for MVP:

1. **Minimal** — sans-serif, tight spacing, no decoration, maximum density
2. **Modern** — clean sans-serif, subtle section borders, light background accents
3. **Classic** — serif font, generous spacing, traditional feel (good for lyrics/poetry)

Each theme is a CSS file defining: font family, size scale, spacing, borders, accent colors. The layout engine works identically across themes — it measures with the active theme's styles applied.

## Page Layout Controls

Deliberately minimal — the engine does the work, these are escape hatches:

- **Page target:** Fit to 1 page / Fit to 2 pages
- **Orientation:** Portrait (default) / Landscape
- **Paper size:** Letter (default) / A4
- **Font size override:** Auto (default) / Small / Medium / Large

## User Flow

1. Paste or type content
2. See it auto-fit in the live preview
3. Optionally tweak theme, page count, orientation
4. Hit Print
