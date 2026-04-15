/**
 * Google Docs API Read Integration
 */

import { Tokens } from '../auth/tokens';
import { DocsToMdConverter } from '../converter/docs-to-md';
import { extractDocId } from '../security/url-validator';
import { Errors } from '../utils/errors';

export async function readDoc(url: string, tokens: Tokens): Promise<string> {
  const docId = extractDocId(url);
  if (!docId) throw Errors.BadRequest('Invalid Google Doc URL');

  const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw Errors.InternalError(`Google API Read Failed: ${error}`);
  }

  const doc = await response.json();
  const converter = new DocsToMdConverter();
  return converter.convert(doc);
}
