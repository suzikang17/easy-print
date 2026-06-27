import type { Template } from './index';

// Print reading layouts for the Blog Post template. All share the same core
// house typography; they differ in measure, columns, and density.
export type BlogStyle = 'classic' | 'twocol' | 'cornell';

export const blogStyles: { name: BlogStyle; label: string }[] = [
	{ name: 'classic', label: 'Classic Essay' },
	{ name: 'twocol', label: 'Two-Column' },
	{ name: 'cornell', label: 'Cornell Notes' },
];

const MONTHS =
	'January|February|March|April|May|June|July|August|September|October|November|December';

// A standalone date line near the top, e.g. "November 2019" or "March 5, 2024".
// Trailing [^\S\n]* matches spaces/tabs only — never the newline, so blank
// lines around the match are preserved for the markdown parser.
const DATE_LINE = new RegExp(`^((?:${MONTHS})\\s+(?:\\d{1,2},\\s*)?\\d{4})[^\\S\\n]*$`, 'im');

// Footnote reference markers like [1], [2] on their own.
const FOOTNOTE_MARKER = /(^|\n)\[\d+\]\s/;

// A standalone bold "Notes"/"Footnotes" line that should be a real heading.
const NOTES_HEADING = /^\*\*[^\S\n]*(Notes|Footnotes)[^\S\n]*\*\*[^\S\n]*$/gim;

export const blogpostTemplate: Template = {
	name: 'blogpost',
	label: 'Blog Post',
	cssClass: 'template-blogpost',
	fitToContent: true,

	detect(input: string): boolean {
		return DATE_LINE.test(input) || FOOTNOTE_MARKER.test(input);
	},

	transform(input: string): string {
		let result = input;

		// Promote a bold Notes/Footnotes line into a section heading.
		result = result.replace(NOTES_HEADING, (_, label) => `## ${label}`);

		// Tag the first date line as a byline so the house style can format it.
		result = result.replace(DATE_LINE, (_, date) => `<p class="byline">${date}</p>`);

		return result;
	}
};
