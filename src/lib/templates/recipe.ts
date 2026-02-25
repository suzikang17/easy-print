import type { Template } from './index';

const SECTION_KEYWORDS =
	/^(Ingredients|Instructions|Directions|Method|Steps|Preparation|Notes|Tips)\s*$/im;
const META_PATTERN =
	/^(Prep\s*time|Cook\s*time|Total\s*time|Servings|Serves|Yield)\s*[:：]\s*(.+)$/gim;

export const recipeTemplate: Template = {
	name: 'recipe',
	label: 'Recipe',
	cssClass: 'template-recipe',

	detect(input: string): boolean {
		return SECTION_KEYWORDS.test(input);
	},

	transform(input: string): string {
		let result = input;

		result = result.replace(
			/^(Ingredients|Instructions|Directions|Method|Steps|Preparation|Notes|Tips)\s*$/gim,
			(_, section) => `## ${section}`
		);

		result = result.replace(META_PATTERN, (_, label, value) => `**${label}:** ${value.trim()}`);

		return result;
	}
};
