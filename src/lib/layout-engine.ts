export interface LayoutConfig {
	pageWidth: number; // px (816 for letter at 96dpi)
	pageHeight: number; // px (1056 for letter at 96dpi)
	maxPages: number; // 1 or 2
	orientation: 'portrait' | 'landscape';
	fontSizeOverride: number | null; // null = auto
}

export interface LayoutResult {
	fontSize: number;
	columns: number;
	marginPx: number;
	pageWidth: number;
	pageHeight: number;
}

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 9;
const DEFAULT_MARGIN = 48;
const MIN_MARGIN = 24;
const MAX_COLUMNS = 3;

/**
 * Given a measured content height (at default settings),
 * compute layout parameters to fit within the target page(s).
 */
export function computeLayout(contentHeight: number, config: LayoutConfig): LayoutResult {
	const pageWidth = config.orientation === 'landscape' ? config.pageHeight : config.pageWidth;
	const pageHeight = config.orientation === 'landscape' ? config.pageWidth : config.pageHeight;

	const totalHeight = pageHeight * config.maxPages;

	let fontSize = config.fontSizeOverride ?? DEFAULT_FONT_SIZE;
	let marginPx = DEFAULT_MARGIN;
	let columns = 1;

	const availableHeight = () => totalHeight - marginPx * 2;
	const effectiveHeight = () => {
		const scale = fontSize / DEFAULT_FONT_SIZE;
		return (contentHeight * scale) / columns;
	};

	// If font size is overridden, skip auto-sizing of font
	const canAdjustFont = config.fontSizeOverride === null;

	// Step 1: Reduce margins
	while (effectiveHeight() > availableHeight() && marginPx > MIN_MARGIN) {
		marginPx -= 4;
	}

	// Step 2: Add columns
	while (effectiveHeight() > availableHeight() && columns < MAX_COLUMNS) {
		columns += 1;
	}

	// Step 3: Reduce font size (last resort)
	if (canAdjustFont) {
		while (effectiveHeight() > availableHeight() && fontSize > MIN_FONT_SIZE) {
			fontSize -= 0.5;
		}
		fontSize = Math.max(fontSize, MIN_FONT_SIZE);
	}

	return { fontSize, columns, marginPx, pageWidth, pageHeight };
}
