# Research: Passphrase in URL Path

## Decision: URL Path Authentication Strategy

We will migrate the MCP SSE authentication from a query parameter to a path-based segment. The new
endpoint will be `/mcp/{passphrase}/sse`.

## Rationale

1. **Security & Privacy**: Query parameters are often logged by web servers, proxies, and browser
   histories. Moving the secret (passphrase) to the path segment is a common practice to reduce the
   risk of accidental exposure in log files, though it still requires TLS for full protection.
2. **RESTful Patterns**: Treating the user's "session" or "identity" (represented by the passphrase)
   as a resource in the path aligns with RESTful architectural styles.
3. **Clarity**: It clearly separates the resource identifier (the user's MCP instance) from optional
   modifiers (query parameters).

## Implementation Strategy

1. **Routing Update**: Modify `src/index.ts` to use a more flexible routing approach. Since we are
   using a manual `URL` parsing in the `fetch` handler, we will use a regex or string manipulation
   to extract the passphrase from the `/mcp/{passphrase}/sse` pattern.
2. **SSE Message Endpoint**: The `SSEServerTransport` currently uses `/mcp/messages`. We need to
   ensure that the client-side POST requests to `/mcp/messages` also include the passphrase or that
   the transport is initialized such that it knows which session it belongs to.
   - _Investigation_: In the MCP SDK, `SSEServerTransport` takes an endpoint for messages. If we use
     a single `/mcp/messages` endpoint for all users, we have a problem: how does the server know
     which transport a message belongs to?
   - _Discovery_: The `SSEServerTransport` usually relies on the SSE connection being established
     first. However, the `POST` messages are sent to a separate endpoint.
   - _Resolution_: We will use `/mcp/{passphrase}/messages` as the message endpoint to maintain
     isolation.

## Alternatives Considered

1. **Authorization Header**: Using a `Bearer` token in the `Authorization` header.
   - _Rejected_: Standard SSE (EventSource) in browsers does not easily support custom headers
     without polyfills or complex workarounds. MCP's SSE transport is designed to be simple.
2. **Migration Period**: Supporting both formats.
   - _Rejected_: Per user directive, we are performing an immediate migration to enforce the new
     security standard.
