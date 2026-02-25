import { lyricsTemplate } from './lyrics';
import { recipeTemplate } from './recipe';

export interface Template {
	name: string;
	label: string;
	cssClass: string;
	detect: (input: string) => boolean;
	transform: (input: string) => string;
}

export type TemplateName = 'none' | 'lyrics' | 'recipe';

export const templates: Template[] = [lyricsTemplate, recipeTemplate];

export function getTemplate(name: TemplateName): Template | undefined {
	return templates.find((t) => t.name === name);
}
