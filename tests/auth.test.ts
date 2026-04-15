import { describe, it, expect } from 'vitest';
import { generatePassphrase, hashPassphrase } from '../src/auth/passphrase';
import { WORDLIST } from '../src/utils/wordlist';
import { generateAuthUrl } from '../src/auth/oauth';

describe('Auth - Passphrase', () => {
  it('should generate a passphrase with correct number of words', () => {
    const passphrase = generatePassphrase(6);
    const words = passphrase.split('-');
    expect(words.length).toBe(6);
    words.forEach((word) => {
      expect(WORDLIST).toContain(word);
    });
  });

  it('should generate different passphrases', () => {
    const p1 = generatePassphrase();
    const p2 = generatePassphrase();
    expect(p1).not.toBe(p2);
  });

  it('should hash a passphrase consistently', async () => {
    const h1 = await hashPassphrase('apple-beach-clock-dance-eagle-frost');
    const h2 = await hashPassphrase('apple-beach-clock-dance-eagle-frost');
    const h3 = await hashPassphrase(' APPLE-beach-clock-DANCE-eagle-frost ');

    expect(h1).toBe(h2);
    expect(h1).toBe(h3); // Case and whitespace insensitive
    expect(h1).toHaveLength(64); // SHA-256 hex length
  });
});

describe('Auth - OAuth', () => {
  const env = {
    GOOGLE_CLIENT_ID: 'test_client_id',
    GOOGLE_CLIENT_SECRET: 'test_secret',
    REDIRECT_URI: 'https://test.com/callback',
    ENCRYPTION_KEY: 'dGVzdF9rZXk=', // test_key in base64
  } as any;

  it('should generate a valid auth URL with state', async () => {
    const state = 'test_state';
    const url = await generateAuthUrl(env, state);
    const parsedUrl = new URL(url);

    expect(parsedUrl.origin).toBe('https://accounts.google.com');
    expect(parsedUrl.pathname).toBe('/o/oauth2/v2/auth');
    expect(parsedUrl.searchParams.get('client_id')).toBe(env.GOOGLE_CLIENT_ID);
    expect(parsedUrl.searchParams.get('state')).toBe(state);
    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(env.REDIRECT_URI);
  });
});
