<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    interface Shortcut {
        key: string;
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        action: () => void;
        description: string;
    }

    let showHelp = $state(false);

    const shortcuts: Shortcut[] = [
        { key: 'n', ctrl: true, action: () => window.location.href = '/', description: 'New scan' },
        { key: 'd', ctrl: true, action: () => window.location.href = '/dashboard', description: 'Dashboard' },
        { key: 'r', ctrl: true, action: () => window.location.href = '/results', description: 'Results' },
        { key: 'b', ctrl: true, action: () => window.location.href = '/tools/avg-brief', description: 'AVG Brief' },
        { key: ',', ctrl: true, action: () => window.location.href = '/settings', description: 'Settings' },
        { key: '?', shift: true, action: () => showHelp = !showHelp, description: 'Show shortcuts' },
        { key: 'Escape', action: () => showHelp = false, description: 'Close dialog' },
    ];

    function handleKeydown(e: KeyboardEvent) {
        // Ignore if in input/textarea
        if (e.target instanceof HTMLInputElement || 
            e.target instanceof HTMLTextAreaElement) {
            return;
        }

        for (const shortcut of shortcuts) {
            const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
            const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
            const altMatch = shortcut.alt ? e.altKey : !e.altKey;
            
            if (e.key.toLowerCase() === shortcut.key.toLowerCase() && 
                ctrlMatch && shiftMatch && altMatch) {
                e.preventDefault();
                shortcut.action();
                return;
            }
        }
    }

    function formatShortcut(s: Shortcut): string {
        const parts: string[] = [];
        if (s.ctrl) parts.push('Ctrl');
        if (s.shift) parts.push('Shift');
        if (s.alt) parts.push('Alt');
        parts.push(s.key.toUpperCase());
        return parts.join(' + ');
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showHelp}
    <div class="shortcut-overlay" onclick={() => showHelp = false}>
        <div class="shortcut-dialog" onclick={(e) => e.stopPropagation()}>
            <h2>Keyboard Shortcuts</h2>
            <div class="shortcut-list">
                {#each shortcuts as s}
                    <div class="shortcut-row">
                        <kbd>{formatShortcut(s)}</kbd>
                        <span>{s.description}</span>
                    </div>
                {/each}
            </div>
            <button class="btn btn-secondary" onclick={() => showHelp = false}>
                Close (Esc)
            </button>
        </div>
    </div>
{/if}

<style>
    .shortcut-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .shortcut-dialog {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
    }

    h2 {
        font-size: 1.25rem;
        margin-bottom: 1.5rem;
    }

    .shortcut-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .shortcut-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    kbd {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-family: monospace;
        font-size: 0.85rem;
    }

    span {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }
</style>
