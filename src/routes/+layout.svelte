<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Local GDPR Scanner</title>
</svelte:head>

<div class="app">
	<header>
		<div class="logo">
			<span class="icon">🔒</span>
			<h1>Local GDPR Scanner</h1>
		</div>
		<nav>
			<a href="/">Scanner</a>
			<a href="/dashboard">Dashboard</a>
			<a href="/results">Resultaten</a>
			<a href="/tools/avg-brief">AVG Brief</a>
			<a href="/settings">Instellingen</a>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>100% lokaal • Geen externe API's • Uw data blijft op uw apparaat</p>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo .icon {
		font-size: 1.5rem;
	}

	.logo h1 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text);
	}

	nav {
		display: flex;
		gap: 1.5rem;
	}

	nav a {
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s;
	}

	nav a:hover {
		color: var(--text);
	}

	main {
		flex: 1;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	footer {
		padding: 1rem 2rem;
		text-align: center;
		border-top: 1px solid var(--border);
		background: var(--surface);
	}

	footer p {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}
</style>
