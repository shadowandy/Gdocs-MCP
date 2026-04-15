/**
 * MCP Tool Definitions
 */

import { z } from 'zod';

export const ToolDefinitions = {
  google_docs_read: {
    description: 'Read a Google Doc and convert it to Markdown',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The Google Doc URL' },
      },
      required: ['url'],
    },
  },
  google_docs_write: {
    description: 'Write Markdown to a Google Doc (overwrites existing content)',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The Google Doc URL' },
        markdown: { type: 'string', description: 'The Markdown content to write' },
      },
      required: ['url', 'markdown'],
    },
  },
  google_docs_update_section: {
    description: 'Update a specific section of a Google Doc (identified by heading)',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The Google Doc URL' },
        heading: { type: 'string', description: 'The heading of the section to update' },
        markdown: { type: 'string', description: 'The new Markdown content for this section' },
      },
      required: ['url', 'heading', 'markdown'],
    },
  },
};
