import { marked } from 'marked';

/**
 * Parse markdown content into HTML with section wrappers.
 * Each top-level heading starts a new section div.
 */
export function parseContent(input: string): string {
	if (!input.trim()) return '';

	const rawHtml = marked.parse(input, { async: false, breaks: true }) as string;

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
