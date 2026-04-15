# Feature Specification: Google Docs MCP Server

**Feature Branch**: `001-gdocs-mcp-server`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "A multi-tenant MCP server running on Cloudflare Workers that enables Claude.ai to read and write Google Docs via Google OAuth2 and Markdown conversion."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Registration & Authentication (Priority: P1)

As a Claude.ai user, I want to securely connect my Google account to the MCP server so that I can grant Claude access to my documents without sharing my primary Google credentials directly with the LLM.

**Why this priority**: This is the foundational entry point. Without secure authentication and multi-tenant isolation, the server cannot function safely.

**Independent Test**: Can be fully tested by visiting the `/auth/register` endpoint, completing the Google OAuth flow, and receiving a unique passphrase that successfully retrieves encrypted tokens from KV.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they visit `/auth/register`, **Then** they are redirected to Google's OAuth consent screen with the correct scopes (`documents`, `drive.file`).
2. **Given** a successful OAuth callback, **When** the server processes the code, **Then** it generates a human-readable passphrase (e.g., `tiger-maple-7-cloud`), encrypts the tokens, and stores them in KV.
3. **Given** an existing passphrase, **When** checking `/auth/status/{passphrase}`, **Then** it returns the authentication status and user email.

---

### User Story 2 - Basic Document Reading & Writing (Priority: P2)

As a Claude.ai user, I want Claude to be able to read my existing Google Docs and create new ones (or overwrite existing ones) using Markdown, so that I can collaborate with the AI on document content.

**Why this priority**: This is the core value proposition of the MCP server.

**Independent Test**: Can be tested by connecting Claude.ai to the SSE endpoint and executing `google_docs_read` and `google_docs_write` tools against a test document.

**Acceptance Scenarios**:

1. **Given** a valid document URL, **When** Claude calls `google_docs_read`, **Then** the server returns the document content converted to Markdown.
2. **Given** Markdown content and a document URL, **When** Claude calls `google_docs_write` with `mode="replace"`, **Then** the document is cleared and updated with the new content, preserving formatting (headings, bold, lists).
3. **Given** Markdown content, **When** Claude calls `google_docs_write` with `mode="append"`, **Then** the content is added to the end of the document.

---

### User Story 3 - Precision Section Updates (Priority: P3)

As a Claude.ai user, I want Claude to update only specific sections of a large document without rewriting the entire file, to avoid hitting API limits or losing other concurrent changes.

**Why this priority**: Enhances usability for large documents and minimizes the risk of overwriting unrelated content.

**Independent Test**: Can be tested by calling `google_docs_update_section` with a specific heading and verifying that only the content under that heading is modified.

**Acceptance Scenarios**:

1. **Given** a document with multiple headings, **When** `google_docs_update_section` is called with an exact heading match, **Then** only the content between that heading and the next heading of equal or higher level is replaced.
2. **Given** a heading that does not exist, **When** `google_docs_update_section` is called, **Then** an appropriate error is returned to Claude.

---

### Edge Cases

- **Token Expiry**: If an access token is expired, the system attempts a transparent refresh. If the refresh token is also invalid or missing, the system MUST return a clear "Account Unlinked" error with instructions to visit `/auth/register`.
- **Invalid URL**: What happens when a non-Google Docs URL or a malformed URL is provided? (Assumption: Regex validation rejects it early).
- **Rate Limiting**: How does the system handle a brute-force attempt on a passphrase? (Assumption: 10 failed attempts trigger a 5-minute lockout).
- **Conflict Resolution**: The system follows a "Last Write Wins" strategy. Concurrent edits by other users between a tool's read and write phases are overwritten by the server's update.
- **Permission Errors**: If Google API returns an "Insufficient Permissions" error, the system MUST return a detailed error message to Claude, explaining that the user lacks write access to the document.
- Large Documents: The converter MUST validate total request count and character length before submission. If limits are exceeded, return a clear "Document Too Large" error.


## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an MCP SSE transport endpoint at `/mcp/{passphrase}/sse`.
- **FR-002**: System MUST generate passphrases using a `{word}-{word}-{digit}-{word}` pattern with ~39 bits of entropy.
- **FR-003**: Tokens MUST be encrypted using AES-256-GCM before being stored in Cloudflare KV.
- **FR-004**: Converter MUST support two-pass conversion: Pass 1 for text insertion, Pass 2 for formatting application (in reverse index order).
- **FR-005**: System MUST support conversion of: Headings (1-3), Bold, Italic, Inline Code, Links, Bullet/Numbered Lists, and GitHub Flavored Markdown (GFM) Tables.
- **FR-006**: System MUST validate all Google Docs URLs to ensure they match `https://docs.google.com/document/d/{doc_id}/edit`.
- **FR-007**: System MUST implement per-passphrase rate limiting (30 requests per minute).

### Key Entities

- **User Session**: Temporary state during OAuth flow (`state`, `passphrase`, `ttl`).
- **User Credentials**: Persistent encrypted tokens (`access_token`, `refresh_token`, `expiry`, `email`) keyed by passphrase.
- **Document AST**: Intermediate representation of Markdown/Docs content for conversion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Successful end-to-end authentication takes less than 30 seconds for a user.
- **SC-002**: Markdown to Google Docs conversion maintains 100% fidelity for supported styles (Headings, Bold, Lists, Tables).
- **SC-003**: System handles token refresh automatically without user intervention or tool failure.
- **SC-004**: Unauthorized access attempts (brute-force) are blocked by rate limiting and lockout within 10 attempts.
- **SC-005**: All system logs are emitted in Structured JSON format for Cloudflare Workers observability.


## Assumptions

- **Cloudflare Environment**: Assumes availability of Cloudflare Workers and KV.
- **Google API**: Assumes the Google Docs API remains stable and supports the `batchUpdate` operations used.
- **Claude.ai**: Assumes Claude.ai continues to support MCP over SSE transport.
- **Network**: Assumes users and the Worker have stable internet connectivity to Google APIs.
