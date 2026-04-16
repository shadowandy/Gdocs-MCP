# API Contract: Path-based MCP Connection

## Endpoints

### 1. Establish SSE Connection

Establish a long-running Server-Sent Events connection for the MCP protocol.

- **URL**: `GET /mcp/{passphrase}/sse`
- **Authentication**: `passphrase` in the path.
- **Success Response**: `200 OK` with `Content-Type: text/event-stream`.
- **Error Response**: `401 Unauthorized` if passphrase is invalid.

### 2. Post MCP Messages

Send JSON-RPC messages to the server for a specific session.

- **URL**: `POST /mcp/{passphrase}/messages`
- **Authentication**: `passphrase` in the path.
- **Body**: Standard MCP JSON-RPC message.
- **Success Response**: `200 OK`.
- **Error Response**: `401 Unauthorized` if passphrase is invalid.

## Deprecated Endpoints (REMOVED)

- `GET /mcp/sse?passphrase=...`: No longer supported.
- `POST /mcp/messages`: No longer supported (unless passphrase was somehow associated, but path-based is now mandatory).
