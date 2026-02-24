export type ThemeName = 'minimal' | 'modern' | 'classic';

export interface ThemeConfig {
	name: ThemeName;
	label: string;
	cssClass: string;
}

export const themes: ThemeConfig[] = [
	{ name: 'minimal', label: 'Minimal', cssClass: 'theme-minimal' },
	{ name: 'modern', label: 'Modern', cssClass: 'theme-modern' },
	{ name: 'classic', label: 'Classic', cssClass: 'theme-classic' },
];
