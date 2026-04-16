# Data Model: Passphrase in URL Path

## Entities

### MCP Connection URL

The primary interface for client connectivity.

| Field      | Type   | Description                                      |
| ---------- | ------ | ------------------------------------------------ |
| worker_url | string | The base deployment URL of the Cloudflare Worker |
| passphrase | string | The 6-word secret generated during registration  |
| endpoint   | string | Constant: `sse` or `messages`                    |

**URL Format:** `https://{worker_url}/mcp/{passphrase}/{endpoint}`

## Validation Rules

1. **Passphrase Extraction**: Must be the second segment after `/mcp/`.
2. **Endpoint Validation**: Must be exactly `sse` for the EventSource connection or `messages` for
   POST requests.
3. **Passphrase Format**: Must be a non-empty string. Hashing and verification remain unchanged in
   the `auth` module.
