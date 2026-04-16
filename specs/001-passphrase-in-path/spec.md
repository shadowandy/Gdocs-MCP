# Feature Specification: Passphrase in URL Path

**Feature Branch**: `001-passphrase-in-path`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "Passphase as `https://gdocs-mcp.yourdomain.workers.dev/mcp/tiger-maple-7-cloud/sse` instead of passing a parameter"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Secure Connection via Path-Based Passphrase (Priority: P1)

As a user, I want to connect my MCP client to the server using a URL that contains my passphrase in the path, so that my credentials are part of the resource identifier and not exposed as a query parameter in all contexts.

**Why this priority**: This is the core requirement of the feature. It changes the fundamental way users connect to the service to improve security and privacy.

**Independent Test**: Can be tested by attempting to establish an SSE connection to the new URL format and verifying that the server correctly identifies the user and authorizes the request.

**Acceptance Scenarios**:

1. **Given** a valid passphrase "tiger-maple-7-cloud", **When** a client connects to `https://[worker-url]/mcp/tiger-maple-7-cloud/sse`, **Then** the server MUST successfully establish an SSE connection.
2. **Given** an invalid passphrase, **When** a client connects to `https://[worker-url]/mcp/invalid-passphrase/sse`, **Then** the server MUST return an Unauthorized (401) error.
3. **Given** any passphrase, **When** a client attempts to connect using the legacy query parameter format `https://[worker-url]/mcp/sse?passphrase=...`, **Then** the server MUST return a 401 Unauthorized or 404 Not Found error (as query-based auth is no longer supported).

---

### Edge Cases

- **Empty Passphrase in Path**: What happens when the URL is `https://[worker-url]/mcp//sse`? The system should handle this as a 401 or 404.
- **Malformed URL**: How does the system handle URLs like `https://[worker-url]/mcp/some-passphrase/other-thing`? It should return a 404.
- **Query Parameter Presence**: If a passphrase is provided in both the path and as a query parameter, the system must ignore the query parameter and only validate the path-based one.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support connection URLs in the format `https://[worker-url]/mcp/{passphrase}/sse`.
- **FR-002**: System MUST extract the passphrase exclusively from the URL path.
- **FR-003**: System MUST NOT support the legacy query parameter `?passphrase=...` for authentication; any such attempts must be rejected.
- **FR-004**: System MUST return 401 Unauthorized if the passphrase extracted from the path is invalid or missing.
- **FR-005**: System MUST ensure that the passphrase extracted from the path is hashed and compared against stored hashes for authentication.

### Key Entities _(include if feature involves data)_

- **MCP Connection URL**: Represents the endpoint used by clients to establish an SSE connection. Key attribute is the `passphrase` embedded in the path.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of connection attempts using the correct path-based format `.../mcp/{passphrase}/sse` result in a successful authenticated connection.
- **SC-002**: 100% of connection attempts using an invalid passphrase in the path format result in a 401 Unauthorized response.
- **SC-003**: 100% of connection attempts using the legacy query parameter format result in an authentication failure.

## Assumptions

- **Immediate Migration**: Users are expected to update their connection URLs immediately to the new path-based format.
- **Routing Support**: The Cloudflare Worker routing can handle dynamic path segments for the passphrase.
- **Security**: Moving the passphrase from a query parameter to the path is preferred for security/privacy reasons (e.g., preventing it from being easily logged by intermediary servers).
