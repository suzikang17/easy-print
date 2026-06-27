import { json, error } from '@sveltejs/kit';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import type { RequestHandler } from './$types';

const turndown = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
});

// Drop noise that Readability sometimes leaves in.
turndown.remove(['script', 'style', 'noscript']);

function normalizeUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) throw error(400, 'No URL provided');
	const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	let parsed: URL;
	try {
		parsed = new URL(withProtocol);
	} catch {
		throw error(400, 'That does not look like a valid URL');
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw error(400, 'Only http(s) URLs are supported');
	}
	return parsed.toString();
}

// Remove markdown image syntax: ![alt](src) and bare reference images.
function stripImagesFromMarkdown(md: string): string {
	return md
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		// Collapse blank lines left behind by removed images.
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

async function extract(url: string, stripImages: boolean) {
	let res: Response;
	try {
		res = await fetch(url, {
			headers: {
				// Some sites 403 a bare fetch; present as a normal browser.
				'User-Agent':
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml',
			},
		});
	} catch {
		throw error(502, 'Could not reach that URL');
	}

	if (!res.ok) throw error(502, `The site returned ${res.status}`);

	const contentType = res.headers.get('content-type') ?? '';
	if (!contentType.includes('html') && !contentType.includes('text/plain')) {
		throw error(415, `That URL is not a web page (${contentType || 'unknown type'})`);
	}

	const rawHtml = await res.text();
	const dom = new JSDOM(rawHtml, { url });
	const reader = new Readability(dom.window.document);
	const article = reader.parse();

	if (!article || !article.content) {
		throw error(422, 'Could not extract readable article text from that page');
	}

	let markdownBody = turndown.turndown(article.content).trim();
	if (stripImages) markdownBody = stripImagesFromMarkdown(markdownBody);
	const title = (article.title ?? '').trim();
	const markdown = title ? `# ${title}\n\n${markdownBody}` : markdownBody;

	return {
		title,
		byline: article.byline ?? null,
		excerpt: article.excerpt ?? null,
		markdown,
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const url = normalizeUrl(typeof body?.url === 'string' ? body.url : '');
	return json(await extract(url, body?.stripImages === true));
};

// Allow a quick GET for testing: /api/fetch-url?url=...&stripImages=1
export const GET: RequestHandler = async ({ url }) => {
	const target = normalizeUrl(url.searchParams.get('url') ?? '');
	const stripImages = url.searchParams.get('stripImages') === '1';
	return json(await extract(target, stripImages));
};
