<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { handleOAuthCallback, saveTokens } from '$lib/services/oauth';

    let status = $state('Verbinden...');
    let error = $state('');

    onMount(async () => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');

        if (errorParam) {
            error = `OAuth fout: ${errorParam}`;
            status = 'Mislukt';
            return;
        }

        if (!code || !state) {
            error = 'Ontbrekende OAuth parameters';
            status = 'Mislukt';
            return;
        }

        const tokens = await handleOAuthCallback(code, state);

        if (tokens) {
            saveTokens(tokens);
            status = `Succes! Verbonden met ${tokens.email}`;
            // Redirect after short delay
            setTimeout(() => goto('/'), 1500);
        } else {
            error = 'Kon tokens niet ophalen';
            status = 'Mislukt';
        }
    });
</script>

<div class="callback-page">
    <div class="card">
        <h2>{status}</h2>
        {#if error}
            <p class="error">{error}</p>
            <button class="btn btn-secondary" onclick={() => goto('/')}>
                Terug naar home
            </button>
        {:else}
            <div class="spinner"></div>
        {/if}
    </div>
</div>

<style>
    .callback-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60vh;
    }

    .card {
        text-align: center;
        padding: 3rem;
    }

    .card h2 {
        margin-bottom: 1.5rem;
    }

    .error {
        color: var(--danger);
        margin-bottom: 1.5rem;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
