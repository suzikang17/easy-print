<script lang="ts">
	import '../app.css';
	import '../lib/themes/minimal.css';
	import '../lib/themes/modern.css';
	import '../lib/themes/classic.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
