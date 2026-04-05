import { writable } from 'svelte/store';

type Theme = 'dark' | 'light';

function createThemeStore() {
    const { subscribe, set, update } = writable<Theme>('dark');

    return {
        subscribe,
        toggle: () => {
            update(current => {
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                return next;
            });
        },
        init: () => {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('theme') as Theme | null;
                const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                const theme = stored || preferred;
                document.documentElement.setAttribute('data-theme', theme);
                set(theme);
            }
        }
    };
}

export const theme = createThemeStore();
