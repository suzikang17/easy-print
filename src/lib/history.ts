/*
 * Import history, persisted to localStorage. Each successful URL import is
 * stored with its fetched markdown so it can be reopened instantly (offline,
 * no re-fetch). Most-recent first, deduped by URL, capped at MAX entries.
 */
const KEY = 'easy-print:history';
const MAX = 15;

export interface HistoryEntry {
	id: string;
	url: string;
	title: string;
	markdown: string;
	savedAt: number;
}

function read(): HistoryEntry[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
	} catch {
		return [];
	}
}

function write(entries: HistoryEntry[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(entries));
	} catch {
		// Storage full or disabled (e.g. private mode) — fail silently.
	}
}

export function loadHistory(): HistoryEntry[] {
	return read();
}

export function addHistory(entry: { url: string; title: string; markdown: string }): HistoryEntry[] {
	const savedAt = Date.now();
	const id = `${savedAt}-${Math.random().toString(36).slice(2, 8)}`;
	// Drop any prior entry for the same URL so re-imports move to the top.
	const existing = read().filter((e) => e.url !== entry.url);
	const next = [{ id, ...entry, savedAt }, ...existing].slice(0, MAX);
	write(next);
	return next;
}

export function removeHistory(id: string): HistoryEntry[] {
	const next = read().filter((e) => e.id !== id);
	write(next);
	return next;
}

export function clearHistory(): HistoryEntry[] {
	write([]);
	return [];
}
