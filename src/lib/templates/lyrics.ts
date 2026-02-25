import type { Template } from './index';

const SECTION_PATTERN =
	/^\[(Verse\s*\d*|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain|Interlude)\]/im;

export const lyricsTemplate: Template = {
	name: 'lyrics',
	label: 'Lyrics',
	cssClass: 'template-lyrics',

	detect(input: string): boolean {
		return SECTION_PATTERN.test(input);
	},

	transform(input: string): string {
		return input.replace(
			/^\[(Verse\s*\d*|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain|Interlude)\]\s*/gim,
			(_, section) => `## ${section}\n`
		);
	}
};
