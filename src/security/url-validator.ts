/**
 * Google Docs URL Regex Validation and ID Extraction
 */

/**
 * Extracts document ID from Google Docs URL
 * Format: https://docs.google.com/document/d/[DOC_ID]/...
 */
export function extractDocId(url: string): string | null {
  const regex = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Validates if the string is a valid Google Docs URL
 */
export function isValidDocUrl(url: string): boolean {
  return !!extractDocId(url);
}
