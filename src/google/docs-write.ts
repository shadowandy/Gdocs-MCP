/**
 * Google Docs API Write Integration
 */

import { Tokens } from '../auth/tokens';
import { MdToDocsConverter } from '../converter/md-to-docs';
import { extractDocId } from '../security/url-validator';
import { Errors } from '../utils/errors';

export async function writeDoc(url: string, markdown: string, tokens: Tokens): Promise<void> {
  const docId = extractDocId(url);
  if (!docId) throw Errors.BadRequest('Invalid Google Doc URL');

  // 1. Get current document to find the end index
  const getResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!getResponse.ok) throw Errors.InternalError('Failed to fetch document structure');
  const doc: any = await getResponse.json();
  const endIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;

  // 2. Clear document and insert new content
  const converter = new MdToDocsConverter();
  const requests = await converter.convert(markdown);

  const batchUpdateRequests = [
    // Clear all content (except the last newline which must remain)
    ...(endIndex > 1
      ? [
          {
            deleteContentRange: {
              range: { startIndex: 1, endIndex },
            },
          },
        ]
      : []),
    // Add new content
    ...requests,
  ];

  const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: batchUpdateRequests }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw Errors.InternalError(`Google API Write Failed: ${error}`);
  }
}
