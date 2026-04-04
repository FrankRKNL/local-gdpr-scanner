/**
 * OAuth2 Service for Gmail and Outlook
 * Handles authentication without storing passwords
 * 
 * Note: For production, register your app at:
 * - Google: https://console.cloud.google.com/apis/credentials
 * - Microsoft: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
 * 
 * For this demo, we use a simple approach that works for most users.
 */

export type OAuthProvider = 'google' | 'microsoft';

export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    email: string;
}

// OAuth2 configuration
const CONFIG = {
    google: {
        clientId: '',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'profile', 'email'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
    },
    microsoft: {
        clientId: '',
        scopes: ['https://graph.microsoft.com/Mail.Read', 'profile', 'email'],
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    },
};

/**
 * Start OAuth flow - opens provider login page
 */
export async function startOAuthFlow(provider: OAuthProvider): Promise<void> {
    const config = CONFIG[provider];

    // Generate PKCE challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store for verification
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_provider', provider);

    // Build auth URL
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: `${window.location.origin}/auth/callback`,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    // Open in new window or redirect
    const authUrl = `${config.authUrl}?${params.toString()}`;
    window.location.href = authUrl;
}

/**
 * Handle OAuth callback - exchange code for tokens
 */
export async function handleOAuthCallback(code: string, state: string): Promise<OAuthTokens | null> {
    // Verify state
    const savedState = sessionStorage.getItem('oauth_state');
    const savedProvider = sessionStorage.getItem('oauth_provider') as OAuthProvider | null;
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    if (state !== savedState || !savedProvider || !codeVerifier) {
        console.error('[OAuth] State mismatch or missing data');
        return null;
    }

    const config = CONFIG[savedProvider];

    try {
        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: config.clientId,
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${window.location.origin}/auth/callback`,
                code_verifier: codeVerifier,
            }),
        });

        if (!response.ok) {
            throw new Error('Token exchange failed');
        }

        const data = await response.json();

        // Get user email
        const email = await getUserEmail(savedProvider, data.access_token);

        // Clear session storage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_provider');

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + (data.expires_in * 1000),
            email,
        };
    } catch (e) {
        console.error('[OAuth] Token exchange error:', e);
        return null;
    }
}

/**
 * Get user email from provider
 */
async function getUserEmail(provider: OAuthProvider, accessToken: string): Promise<string> {
    if (provider === 'google') {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return data.email || '';
    } else {
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return data.mail || data.userPrincipalName || '';
    }
}

/**
 * Check if we have valid tokens
 */
export function hasValidTokens(): boolean {
    const tokensStr = localStorage.getItem('oauth_tokens');
    if (!tokensStr) return false;

    const tokens: OAuthTokens = JSON.parse(tokensStr);
    return tokens.expiresAt > Date.now();
}

/**
 * Save tokens to storage
 */
export function saveTokens(tokens: OAuthTokens): void {
    localStorage.setItem('oauth_tokens', JSON.stringify(tokens));
}

/**
 * Get stored tokens
 */
export function getTokens(): OAuthTokens | null {
    const tokensStr = localStorage.getItem('oauth_tokens');
    if (!tokensStr) return null;
    return JSON.parse(tokensStr);
}

/**
 * Clear tokens (logout)
 */
export function clearTokens(): void {
    localStorage.removeItem('oauth_tokens');
}

// PKCE helpers
function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
