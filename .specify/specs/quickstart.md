# Quickstart: Google Docs MCP Server

## 1. Local Development Setup
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Start the local worker: `npx wrangler dev`.

## 2. Testing the Authentication Flow
1. Visit `http://localhost:8787/auth/register`.
2. Complete the Google OAuth flow.
3. Note the generated passphrase (e.g., `tiger-maple-7-cloud`).
4. Verify status: `http://localhost:8787/auth/status/tiger-maple-7-cloud`.

## 3. Testing MCP Tools
1. Use a tool like `mcp-cli` or connect via Claude.ai:
   - URL: `http://localhost:8787/mcp/tiger-maple-7-cloud/sse`.
2. Call `google_docs_write`:
   ```json
   {
     "doc_url": "https://docs.google.com/document/d/DOC_ID/edit",
     "content": "# Test Heading\nHello from MCP!",
     "mode": "replace"
   }
   ```
3. Call `google_docs_read`:
   ```json
   { "doc_url": "https://docs.google.com/document/d/DOC_ID/edit" }
   ```

## 4. Running Automated Tests
- `npm test` (Uses Vitest)
