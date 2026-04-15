/**
 * AES-256-GCM Encryption/Decryption using Web Crypto API
 */

const ALGORITHM = 'AES-256-GCM';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 128; // Standard for GCM

/**
 * Gets the crypto key from the base64 encoded secret
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', rawKey, { name: ALGORITHM }, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypts a string using AES-256-GCM
 */
export async function encrypt(text: string, secret: string): Promise<string> {
  const key = await getCryptoKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(text);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    encoded,
  );

  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 string using AES-256-GCM
 */
export async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await getCryptoKey(secret);
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const encrypted = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    encrypted,
  );

  return new TextDecoder().decode(decrypted);
}
