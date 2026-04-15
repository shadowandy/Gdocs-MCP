# Claude.ai Development & Usage Guidelines — Google Docs MCP Server

## Current Status: ✅ Core Tools Functional
All core tools are fully implemented and verified. You have full access to:
- `google_docs_read`: High-fidelity Docs-to-Markdown conversion.
- `google_docs_write`: Full document creation/overwriting with style mapping.
- `google_docs_update_section`: Precision heading-based content updates.

---

## How to Interact with this Server

### 1. Tool Usage Overview
The server exposes three primary tools:
- `google_docs_read`: Read a Google Doc and convert it to Markdown.
- `google_docs_write`: Create or overwrite a Google Doc with Markdown content.
- `google_docs_update_section`: Find and replace a specific section under a heading.

### 2. Markdown Conversion
The server handles the conversion from Markdown to native Google Docs formatting. You should:
- Provide clean, well-structured Markdown.
- Use standard Markdown syntax (headings, bold, lists, tables).
- Note that complex nested tables and inline images are currently not supported via `batchUpdate`.

### 3. Precision Updates
For large documents, use `google_docs_update_section` to target specific headings. This minimizes API overhead and reduces the risk of overwriting unrelated content. Ensure the `section_heading` is an exact match of the heading in the document.

### 4. Authentication
If a tool call fails with an authentication error:
- Direct the user to the `/auth/register` page to reconnect their Google account.
- Remind the user that their unique passphrase is required in the MCP endpoint URL.

## Operational Standards
- **Wait for Confirmation:** Always confirm with the user before performing a `mode="replace"` operation on an existing document.
- **Explain Formatting:** If you're creating a complex document, briefly explain how the Markdown will be rendered (e.g., "I'll use Heading 1 for the title and a table for the itinerary").
- **Error Handling:** If a Google Docs URL is invalid, inform the user and request the correct format: `https://docs.google.com/document/d/{doc_id}/edit`.
