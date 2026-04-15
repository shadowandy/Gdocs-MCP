import { describe, it, expect } from 'vitest';
import { MdToDocsConverter } from '../src/converter/md-to-docs';
import { DocsToMdConverter } from '../src/converter/docs-to-md';

describe('Converter - Markdown to Docs', () => {
  const converter = new MdToDocsConverter();

  it('should convert headings', async () => {
    const requests = await converter.convert('# Heading 1\n## Heading 2');
    expect(requests).toContainEqual(expect.objectContaining({
      insertText: expect.objectContaining({ text: 'Heading 1\n' })
    }));
    expect(requests).toContainEqual(expect.objectContaining({
      updateParagraphStyle: expect.objectContaining({
        paragraphStyle: { namedStyleType: 'HEADING_1' }
      })
    }));
  });

  it('should convert bold and italic', async () => {
    const requests = await converter.convert('**bold** and *italic*');
    expect(requests).toContainEqual(expect.objectContaining({
      updateTextStyle: expect.objectContaining({
        textStyle: { bold: true }
      })
    }));
    expect(requests).toContainEqual(expect.objectContaining({
      updateTextStyle: expect.objectContaining({
        textStyle: { italic: true }
      })
    }));
  });
});

describe('Converter - Docs to Markdown', () => {
  const converter = new DocsToMdConverter();

  it('should convert simple paragraph', () => {
    const doc = {
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: 'Hello World' } }]
            }
          }
        ]
      }
    };
    const markdown = converter.convert(doc);
    expect(markdown).toContain('Hello World');
  });

  it('should convert headings', () => {
    const doc = {
      body: {
        content: [
          {
            paragraph: {
              paragraphStyle: { namedStyleType: 'HEADING_1' },
              elements: [{ textRun: { content: 'Title' } }]
            }
          }
        ]
      }
    };
    const markdown = converter.convert(doc);
    expect(markdown).toBe('# Title\n\n');
  });
});
