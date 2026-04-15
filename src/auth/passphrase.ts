/**
 * Passphrase Generation using Wordlist
 */

import { WORDLIST } from '../utils/wordlist';

/**
 * Generates a random 6-word passphrase
 */
export function generatePassphrase(wordCount = 6): string {
  const array = new Uint32Array(wordCount);
  crypto.getRandomValues(array);
  
  const words = Array.from(array).map(val => WORDLIST[val % WORDLIST.length]);
  return words.join('-');
}

/**
 * Hashes a passphrase for storage and lookup
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(passphrase.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
