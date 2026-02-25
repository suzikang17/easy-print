# Templates System Design

**Goal:** Add content-aware templates (starting with Lyrics and Recipe) that auto-format pasted content and apply print-optimized styling. Extensible for future templates.

**Architecture:** Approach A — Templates are separate from themes. Each template is a module with a content transformer + CSS. They layer on top of existing themes, so users can mix-and-match (e.g., recipe template + classic theme).

---

## Template Interface

Each template lives in `src/lib/templates/` and exports:

```ts
interface Template {
  name: string;        // 'lyrics' | 'recipe'
  label: string;       // 'Lyrics' | 'Recipe'
  cssClass: string;    // 'template-lyrics'
  detect: (input: string) => boolean;
  transform: (input: string) => string;
}
```

Registry in `src/lib/templates/index.ts` exports all templates, similar to `themes.ts`.

Parser pipeline: **raw input → bullet normalization → template transform → marked parse → section wrapping**.

## Lyrics Template

**Detection:** Bracket-style section markers — `[Verse`, `[Chorus`, `[Bridge`, `[Intro`, `[Outro`.

**Transform:**
- `[Verse 1]`, `[Chorus]`, etc. → `## Verse 1`, `## Chorus` headings
- Preserves blank lines between stanzas as section breaks
- Keeps single line breaks within stanzas

**CSS:** Compact line-height, minimal verse spacing, smaller heading sizes for section markers.

## Recipe Template

**Detection:** Keywords like `Ingredients`, `Instructions`, `Directions`, `Servings`, `Prep time`.

**Transform:**
- Auto-detects `Ingredients` / `Instructions` / `Notes` → `## Ingredients` etc.
- Lines starting with quantities/measurements get bullet markers
- Numbered steps preserved as ordered lists

**CSS:** Clear section separation, slightly larger body text for kitchen readability, two-column-friendly layout.

## Toolbar Integration

- New "Template" dropdown between Theme and Pages
- Options: `None` (default), `Lyrics`, `Recipe`
- Template `cssClass` added to page element alongside theme class
- Template `transform()` runs on raw content before parsing

## Auto-detect

- Manual selection only for v1 — user picks template from dropdown
- Auto-detect can be added later
