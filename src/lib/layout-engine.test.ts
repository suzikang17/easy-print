import { describe, it, expect } from 'vitest';
import { computeLayout, type LayoutConfig, type LayoutResult } from './layout-engine';

describe('computeLayout', () => {
	const defaultConfig: LayoutConfig = {
		pageWidth: 816, // 8.5" at 96dpi
		pageHeight: 1056, // 11" at 96dpi
		maxPages: 1,
		orientation: 'portrait',
		fontSizeOverride: null,
	};

	it('returns default layout when content fits', () => {
		const result = computeLayout(100, defaultConfig);
		expect(result.fontSize).toBe(16);
		expect(result.columns).toBe(1);
		expect(result.marginPx).toBe(48);
	});

	it('reduces margins first when content overflows', () => {
		const result = computeLayout(1100, defaultConfig);
		expect(result.marginPx).toBeLessThan(48);
	});

	it('adds columns when margin reduction is not enough', () => {
		const result = computeLayout(2500, defaultConfig);
		expect(result.columns).toBeGreaterThan(1);
	});

	it('reduces font size as last resort', () => {
		const result = computeLayout(5000, defaultConfig);
		expect(result.fontSize).toBeLessThan(16);
	});

	it('never goes below minimum font size', () => {
		const result = computeLayout(50000, defaultConfig);
		expect(result.fontSize).toBeGreaterThanOrEqual(9);
	});

	it('respects font size override', () => {
		const config = { ...defaultConfig, fontSizeOverride: 14 as number | null };
		const result = computeLayout(100, config);
		expect(result.fontSize).toBe(14);
	});

	it('doubles available height for 2-page mode', () => {
		const config1 = { ...defaultConfig, maxPages: 1 };
		const config2 = { ...defaultConfig, maxPages: 2 };
		const result1 = computeLayout(2000, config1);
		const result2 = computeLayout(2000, config2);
		// 2-page mode should need fewer adjustments
		expect(result2.fontSize).toBeGreaterThanOrEqual(result1.fontSize);
	});

	it('swaps dimensions for landscape', () => {
		const config = { ...defaultConfig, orientation: 'landscape' as const };
		const result = computeLayout(100, config);
		expect(result.pageWidth).toBe(1056);
		expect(result.pageHeight).toBe(816);
	});
});
