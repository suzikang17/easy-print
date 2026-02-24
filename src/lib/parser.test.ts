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

	it('normalizes non-standard bullet characters to list items', () => {
		const result = parseContent('■ item one\n■ item two');
		expect(result).toContain('<li>item one</li>');
		expect(result).toContain('<li>item two</li>');
	});

	it('normalizes nested non-standard bullets', () => {
		const result = parseContent('- parent\n  ■ child');
		expect(result).toContain('<li>parent');
		expect(result).toContain('<li>child</li>');
		// Should have a nested ul
		expect(result).toContain('<ul>');
	});

	it('preserves single line breaks as <br>', () => {
		const result = parseContent('line one\nline two\nline three');
		expect(result).toContain('<br');
	});

	it('returns empty string for empty input', () => {
		expect(parseContent('')).toBe('');
	});
});
