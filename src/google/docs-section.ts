/**
 * Google Docs API Section-level Updates
 */

import { Tokens } from '../auth/tokens';
import { MdToDocsConverter } from '../converter/md-to-docs';
import { extractDocId } from '../security/url-validator';
import { Errors } from '../utils/errors';

export async function updateSection(
  url: string,
  heading: string,
  markdown: string,
  tokens: Tokens,
): Promise<void> {
  const docId = extractDocId(url);
  if (!docId) throw Errors.BadRequest('Invalid Google Doc URL');

  // 1. Get current document to find the section
  const getResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!getResponse.ok) throw Errors.InternalError('Failed to fetch document structure');
  const doc: any = await getResponse.json();

  const sectionRange = findSectionRange(doc, heading);
  if (!sectionRange) throw Errors.NotFound(`Section with heading "${heading}" not found`);

  // 2. Convert new content
  const converter = new MdToDocsConverter();
  const requests = await converter.convert(markdown);

  // 3. Update the section
  const batchUpdateRequests = [
    // Delete old content
    {
      deleteContentRange: {
        range: sectionRange,
      },
    },
    // Insert new content at the start of where the old section was
    // Note: This is simplified. In a real two-pass, offsets would need careful adjustment.
    ...requests.map(req => {
      if (req.insertText) {
        req.insertText.location.index += sectionRange.startIndex - 1;
      }
      if (req.updateTextStyle) {
        req.updateTextStyle.range.startIndex += sectionRange.startIndex - 1;
        req.updateTextStyle.range.endIndex += sectionRange.startIndex - 1;
      }
      if (req.updateParagraphStyle) {
        req.updateParagraphStyle.range.startIndex += sectionRange.startIndex - 1;
        req.updateParagraphStyle.range.endIndex += sectionRange.startIndex - 1;
      }
      return req;
    }),
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
    throw Errors.InternalError(`Google API Update Failed: ${error}`);
  }
}

function findSectionRange(doc: any, targetHeading: string) {
  const content = doc.body.content || [];
  let startIndex = -1;
  let endIndex = -1;
  let targetLevel = -1;

  for (let i = 0; i < content.length; i++) {
    const el = content[i];
    if (el.paragraph) {
      const style = el.paragraph.paragraphStyle?.namedStyleType || '';
      const text = el.paragraph.elements
        ?.map((e: any) => e.textRun?.content || '')
        .join('')
        .trim();

      if (startIndex === -1) {
        if (text.toLowerCase() === targetHeading.toLowerCase() && style.startsWith('HEADING_')) {
          startIndex = el.startIndex;
          targetLevel = parseInt(style.split('_')[1], 10);
        }
      } else {
        // Find next heading of same or higher level (smaller number)
        if (style.startsWith('HEADING_')) {
          const level = parseInt(style.split('_')[1], 10);
          if (level <= targetLevel) {
            endIndex = el.startIndex;
            break;
          }
        }
      }
    }
  }

  if (startIndex !== -1 && endIndex === -1) {
    // End of document
    endIndex = content[content.length - 1].endIndex - 1;
  }

  return startIndex !== -1 ? { startIndex, endIndex } : null;
}
