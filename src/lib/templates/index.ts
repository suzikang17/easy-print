import { lyricsTemplate } from './lyrics';
import { recipeTemplate } from './recipe';
import { blogpostTemplate } from './blogpost';

export { blogStyles, type BlogStyle } from './blogpost';

export interface Template {
	name: string;
	label: string;
	cssClass: string;
	detect: (input: string) => boolean;
	transform: (input: string) => string;
	// When true, the template reads as a single flowing column at a comfortable
	// font (ignores the Pages cram budget). Right for long-form prose.
	fitToContent?: boolean;
}

export type TemplateName = 'none' | 'lyrics' | 'recipe' | 'blogpost';

export const templates: Template[] = [blogpostTemplate, lyricsTemplate, recipeTemplate];

export function getTemplate(name: TemplateName): Template | undefined {
	return templates.find((t) => t.name === name);
}

// Most-specific first, so the generic blog-post signals (a date line or
// footnote markers) don't shadow a recipe or lyrics that also happen to match.
const DETECT_ORDER: TemplateName[] = ['lyrics', 'recipe', 'blogpost'];

/** Pick the best-fitting template for imported/pasted content, or 'none'. */
export function detectTemplate(input: string): TemplateName {
	for (const name of DETECT_ORDER) {
		if (getTemplate(name)?.detect(input)) return name;
	}
	return 'none';
}
