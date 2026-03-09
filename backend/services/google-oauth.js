/**
 * Google OAuth2 for Gmail (IMAP) – auth URL, code exchange, refresh, userinfo.
 * Used for "Sign in with Google" so users don't need App Passwords.
 */

const GMAIL_SCOPE = 'https://mail.google.com/';
const EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';
const SCOPES = [GMAIL_SCOPE, EMAIL_SCOPE].join(' ');

/**
 * @param {string} redirectUri - Full callback URL (e.g. http://localhost:3000/api/auth/google/callback)
 * @param {string} state - Opaque state (e.g. JSON: companyId, channelType, mailboxIndex)
 * @returns {string} URL to redirect user to for Google sign-in
 */
export function getGoogleAuthUrl(redirectUri, state) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID (or GOOGLE_OAUTH_CLIENT_ID) is not set. Add it to .env to use Sign in with Google.');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent', // force refresh_token
    state: state || '',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 * @param {string} code - From callback ?code=...
 * @param {string} redirectUri - Must match the one used in getGoogleAuthUrl
 * @returns {Promise<{ access_token: string, refresh_token?: string, expires_in: number }>}
 */
export async function exchangeCodeForTokens(code, redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Get a fresh access token using refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{ access_token: string, expires_in: number }>}
 */
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Get user email from Google (requires userinfo.email scope).
 * @param {string} accessToken
 * @returns {Promise<string>} email
 */
export async function getUserEmail(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google userinfo failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.email || '';
}
