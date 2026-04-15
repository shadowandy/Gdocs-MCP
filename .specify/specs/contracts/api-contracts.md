# API Contracts: Google Docs MCP Server

## 1. Authentication Endpoints

### `GET /auth/register`
- **Description**: Generates a passphrase and redirects the user to Google OAuth2 consent.
- **Query Parameters**: None
- **Response**: `302 Redirect` to Google.

### `GET /auth/callback`
- **Description**: Handles the redirect from Google OAuth2.
- **Query Parameters**:
  - `code`: Authorization code.
  - `state`: Cryptographic state from `UserSession`.
- **Response**: `200 OK` (HTML with passphrase) or `400 Bad Request` (State mismatch).

### `GET /auth/status/{passphrase}`
- **Description**: Checks the authentication status for a passphrase.
- **Response**:
  ```json
  { "authenticated": true, "email": "user@example.com" }
  ```

## 2. MCP Protocol Endpoints

### `GET /mcp/{passphrase}/sse`
- **Description**: Establishes an SSE connection for MCP communication.
- **Response**: `text/event-stream` (SSE).

### `POST /mcp/{passphrase}/messages`
- **Description**: Handles MCP JSON-RPC messages (e.g., tool calls).
- **Request Body**: [MCP Message Schema](https://modelcontextprotocol.io/docs/concepts/messages)
- **Response**: `200 OK` (or appropriate error code).

## 3. MCP Tools (Exposed via SSE)

### `google_docs_read`
- **Input**: `{ "doc_url": string }`
- **Output**: `{ "content": string }` (Markdown)

### `google_docs_write`
- **Input**: `{ "doc_url": string, "content": string, "mode": "replace" | "append" }`
- **Output**: `{ "success": true }`

### `google_docs_update_section`
- **Input**: `{ "doc_url": string, "section_heading": string, "content": string }`
- **Output**: `{ "success": true }`
