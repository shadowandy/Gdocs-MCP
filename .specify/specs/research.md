# Research: Google Docs MCP Server

## Decision: Google Docs API `batchUpdate` Limits
**Rationale**: To handle "Large Documents" as required by the specification, the system must respect Google's limits.
- **Request Count**: Limit of 4,000 requests per `batchUpdate`.
- **Payload Size**: Max 10MB per request.
- **Character Limit**: 1,000,000 characters per document.
**Alternatives considered**: Paginating `batchUpdate` calls (rejected for v1 to maintain index consistency).

## Decision: AES-256-GCM in Cloudflare Workers
**Rationale**: Cloudflare Workers natively support the Web Crypto API, which is standard for implementing AES-256-GCM securely with authenticated encryption.
**Alternatives considered**: External encryption libraries like `jose` or `crypto-js` (rejected to minimize bundle size).

## Decision: MCP SDK for Cloudflare Workers
**Rationale**: The `@modelcontextprotocol/sdk` is written in TypeScript and can be adapted to work with Cloudflare's `fetch`-based SSE by manually handling the stream or using a compatible transport wrapper.
**Alternatives considered**: Building a raw MCP handler (rejected for maintenance overhead).

## Decision: Passphrase Wordlist (BIP-39 subset)
**Rationale**: Using a 2048-word list (e.g., BIP-39 English) ensures high entropy (~39 bits for `{word}-{word}-{digit}-{word}`).
**Alternatives considered**: Fully random hex strings (rejected as they are harder for users to type).

## Decision: Compare-and-Swap for KV Token Refresh
**Rationale**: Cloudflare KV is eventually consistent. Using metadata for optimistic locking during token refreshes prevents multiple worker instances from concurrently refreshing and invalidating each other's tokens.
**Alternatives considered**: Cloudflare Durable Objects (rejected for cost/complexity in v1).
