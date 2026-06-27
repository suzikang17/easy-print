declare module 'pagedjs' {
	export class Previewer {
		preview(content: string | Node, stylesheets: string[], renderTo: HTMLElement): Promise<unknown>;
	}
}
