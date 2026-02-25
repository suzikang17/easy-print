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
