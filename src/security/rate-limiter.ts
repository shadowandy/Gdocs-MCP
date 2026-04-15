/**
 * Rate Limiting and Lockout Logic using Cloudflare KV
 */

import { KVNamespace } from '@cloudflare/workers-types';
import { Errors } from '../utils/errors';

const RATE_LIMIT_PREFIX = 'rate_limit:';
const LOCKOUT_PREFIX = 'lockout:';
const MAX_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 3600 * 1000; // 1 hour

/**
 * Checks if a passphrase is currently locked out
 */
export async function checkLockout(kv: KVNamespace, passphraseHash: string): Promise<boolean> {
  const attemptsStr = await kv.get(`${LOCKOUT_PREFIX}${passphraseHash}`);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
  return attempts >= MAX_ATTEMPTS;
}

/**
 * Record a failed attempt and lock out if threshold reached
 */
export async function recordFailedAttempt(
  kv: KVNamespace,
  passphraseHash: string,
): Promise<number> {
  const key = `${LOCKOUT_PREFIX}${passphraseHash}`;
  const attemptsStr = await kv.get(key);
  const attempts = (attemptsStr ? parseInt(attemptsStr, 10) : 0) + 1;

  if (attempts >= MAX_ATTEMPTS) {
    await kv.put(key, attempts.toString(), { expirationTtl: LOCKOUT_DURATION_MS / 1000 });
  } else {
    await kv.put(key, attempts.toString(), { expirationTtl: 86400 }); // Keep for 24h
  }

  return attempts;
}

/**
 * Resets failed attempts after successful auth
 */
export async function resetFailedAttempts(kv: KVNamespace, passphraseHash: string): Promise<void> {
  await kv.delete(`${LOCKOUT_PREFIX}${passphraseHash}`);
}

/**
 * Basic rate limiting check (per-passphrase/user)
 */
export async function checkRateLimit(
  kv: KVNamespace,
  passphraseHash: string,
  limit: number = 30, // 30 requests
  windowSeconds: number = 60, // per minute
): Promise<void> {
  const key = `${RATE_LIMIT_PREFIX}${passphraseHash}`;
  const countStr = await kv.get(key);
  const count = countStr ? parseInt(countStr, 10) : 0;

  if (count >= limit) {
    throw Errors.RateLimited(`Rate limit exceeded (${limit} requests per ${windowSeconds}s)`);
  }

  await kv.put(key, (count + 1).toString(), { expirationTtl: windowSeconds });
}
