# Google Docs MCP Server Constitution

## Core Principles

### I. Security & Privacy First
All features must prioritize user data protection. Every user must have passphrase-scoped token isolation. Tokens must be encrypted at rest using AES-256-GCM with application-layer encryption. Passphrases must be generated with sufficient entropy (~39 bits) to resist brute-force attacks, complemented by strict rate limiting and lockout policies.

### II. Serverless & Global Scalability
The solution must be built for Cloudflare Workers to ensure a serverless, globally distributed architecture with zero cold starts. All state must be managed via Cloudflare KV with appropriate TTLs for session management and rate limiting.

### III. Native Claude.ai Integration (MCP/SSE)
The server must implement the Model Context Protocol (MCP) using Server-Sent Events (SSE) transport. This ensures a native and seamless integration experience for Claude.ai users, allowing them to interact with Google Docs through standard tools.

### IV. Markdown-to-Docs Fidelity
The system must faithfully convert Markdown content provided by the LLM into native Google Docs formatting using the Google Docs API `batchUpdate`. This includes support for headings, lists, tables, inline styling (bold, italic, code, links), and horizontal rules.

### V. Robust Two-Pass Conversion Algorithm
To ensure character index stability during document modification, the conversion process must follow a two-pass strategy:
1. **Pass 1:** Insert all plain text content to establish the character index map.
2. **Pass 2:** Apply all formatting and styles (ordered by descending index) to prevent index shifting.

## Security & Architecture Constraints

### Multi-Tenant Isolation
Each user is a separate tenant identified by a unique passphrase. No shared bearer tokens or global access credentials are permitted. Token refresh operations must use a compare-and-swap pattern to avoid race conditions.

### Minimal Permissions
The application must request only the minimum necessary Google OAuth2 scopes: `documents` for content manipulation and `drive.file` for document discovery and access verification.

### URL & Input Validation
All document URLs must be strictly validated via regex to ensure they point only to `docs.google.com/document/d/{id}` before any processing occurs.

## Development Workflow & Quality Gates

### Test-Driven Development (TDD)
TDD is mandatory for all core logic, particularly the Markdown-to-Docs converter and the Authentication/Encryption modules. Every bug fix must include a reproduction test case.

### Continuous Validation
All changes must be validated against the conversion logic to ensure no regressions in formatting or index calculation. Integration tests must verify the OAuth flow and MCP tool execution.

## Governance
This Constitution supersedes all other development practices. Any divergence from these principles requires a formal architectural review and an update to the project documentation. All pull requests must be verified against this Constitution for compliance.

**Version**: 1.0.0 | **Ratified**: 2026-04-15 | **Last Amended**: 2026-04-15
