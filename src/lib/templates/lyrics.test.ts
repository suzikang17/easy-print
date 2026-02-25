import { describe, it, expect } from 'vitest';
import { lyricsTemplate } from './lyrics';

describe('lyricsTemplate.detect', () => {
	it('detects [Verse] markers', () => {
		expect(lyricsTemplate.detect('[Verse 1]\nSome lyrics here')).toBe(true);
	});

	it('detects [Chorus] markers', () => {
		expect(lyricsTemplate.detect('[Chorus]\nLa la la')).toBe(true);
	});

	it('detects [Bridge] markers', () => {
		expect(lyricsTemplate.detect('[Bridge]\nOoh')).toBe(true);
	});

	it('does not detect plain text', () => {
		expect(lyricsTemplate.detect('Just some regular text')).toBe(false);
	});

	it('does not detect recipe content', () => {
		expect(lyricsTemplate.detect('Ingredients\n- 1 cup flour')).toBe(false);
	});
});

describe('lyricsTemplate.transform', () => {
	it('converts [Verse 1] to ## Verse 1', () => {
		const result = lyricsTemplate.transform('[Verse 1]\nLine one\nLine two');
		expect(result).toContain('## Verse 1');
	});

	it('converts [Chorus] to ## Chorus', () => {
		const result = lyricsTemplate.transform('[Chorus]\nLa la la');
		expect(result).toContain('## Chorus');
	});

	it('converts [Bridge] to ## Bridge', () => {
		const result = lyricsTemplate.transform('[Bridge]\nOoh');
		expect(result).toContain('## Bridge');
	});

	it('converts [Intro] and [Outro]', () => {
		const input = '[Intro]\nGuitar\n\n[Outro]\nFade out';
		const result = lyricsTemplate.transform(input);
		expect(result).toContain('## Intro');
		expect(result).toContain('## Outro');
	});

	it('preserves lines without markers', () => {
		const result = lyricsTemplate.transform('[Verse 1]\nLine one\nLine two');
		expect(result).toContain('Line one');
		expect(result).toContain('Line two');
	});

	it('passes through text with no markers unchanged', () => {
		const input = 'Just some plain lyrics\nWith line breaks';
		expect(lyricsTemplate.transform(input)).toBe(input);
	});
});
