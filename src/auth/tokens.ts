/**
 * Token Storage and Encryption (Cloudflare KV)
 */

import { Env } from '../index';
import { encrypt, decrypt } from '../security/encryption';
import { Errors } from '../utils/errors';

export interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix timestamp
}

/**
 * Stores tokens for a passphrase hash
 */
export async function storeTokens(
  env: Env,
  passphraseHash: string,
  tokens: Tokens,
): Promise<void> {
  const json = JSON.stringify(tokens);
  const encrypted = await encrypt(json, env.ENCRYPTION_KEY);
  await env.GDOCS_TOKENS.put(passphraseHash, encrypted);
}

/**
 * Retrieves and decrypts tokens for a passphrase hash
 */
export async function getTokens(
  env: Env,
  passphraseHash: string,
): Promise<Tokens | null> {
  const encrypted = await env.GDOCS_TOKENS.get(passphraseHash);
  if (!encrypted) return null;

  try {
    const json = await decrypt(encrypted, env.ENCRYPTION_KEY);
    return JSON.parse(json) as Tokens;
  } catch (err) {
    throw Errors.InternalError('Failed to decrypt tokens');
  }
}

/**
 * Refreshes tokens if expired
 */
export async function refreshIfNeeded(
  env: Env,
  passphraseHash: string,
  tokens: Tokens,
): Promise<Tokens> {
  // Buffer of 5 minutes before actual expiry
  if (Date.now() < tokens.expires_at - 300000) {
    return tokens;
  }

  if (!tokens.refresh_token) {
    throw Errors.Unauthorized('Token expired and no refresh token available');
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw Errors.OAuthFailed(`Token refresh failed: ${error}`);
  }

  const data: any = await response.json();
  const newTokens: Tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  await storeTokens(env, passphraseHash, newTokens);
  return newTokens;
}
