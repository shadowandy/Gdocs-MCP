/**
 * Google OAuth2 Redirect and Callback Handling
 */

import { Env } from '../index';
import { Errors } from '../utils/errors';

/**
 * Generates OAuth2 Auth URL
 */
export async function generateAuthUrl(env: Env, state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges auth code for tokens
 */
export async function exchangeCodeForTokens(env: Env, code: string) {
  const params = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw Errors.OAuthFailed(`Token exchange failed: ${error}`);
  }

  return await response.json();
}
