# Google Docs MCP Server — Project-Wide AI Guidelines

## Project Status: ✅ MVP Complete & CI Enabled (Phase 7)

All core functional phases and user stories are fully implemented, tested, and verified. The project
now includes a robust CI/CD pipeline:

- **Phase 1-2 (Foundational):** Secure infrastructure, encryption (AES-256-GCM), and rate limiting
  are operational.
- **Phase 3 (User Story 1):** Multi-tenant OAuth2 registration and passphrase-based authentication
  are complete.
- **Phase 4 (User Story 2):** Two-pass Markdown-to-Docs conversion (Read/Write) is fully functional.
- **Phase 5 (User Story 3):** Precision section updates via heading matching are operational.
- **Phase 6 (Polish):** Documentation and security audits are finished.
- **Phase 7 (Ops):** GitHub Actions CI pipeline, TypeScript strict mode, and linting/formatting
  standards established.

---

## Core Technical Standards

### Runtime & Architecture

- **Environment:** Cloudflare Workers (Serverless).
- **CI/CD:** GitHub Actions (Automated tests, lint, type-check on push/PR).
- **State Management:** Cloudflare KV with application-layer encryption.
- **Protocol:** Model Context Protocol (MCP) over SSE (Server-Sent Events).
- **Authentication:** Multi-tenant Google OAuth2 with passphrase-scoped isolation.

### Code Quality & Formatting

- **TypeScript:** Strict mode enabled. Use `npm run typecheck` for verification.
- **Linting:** ESLint with TypeScript rules. Use `npm run lint`.
- **Formatting:** Prettier for consistent style. Use `npm run format`.
- **Testing:** Vitest for unit and integration tests. Use `npm test`.

### Conversion Logic (Markdown → Google Docs)

- **Algorithm:** TWO-PASS conversion.
  1. **Pass 1:** Insert all plain text to establish character index map.
  2. **Pass 2:** Apply formatting (headings, bold, etc.) in reverse character index order.
- **Validation:** Always verify character indices before and after `batchUpdate` calls.

### Security Mandates

- **Encryption:** AES-256-GCM is the only permitted encryption for tokens.
- **Isolation:** Never leak or share credentials across passphrase scopes.
- **Input:** Document URLs must be regex-validated to ensure they match
  `docs.google.com/document/d/{id}`.

## Development Principles

- **TDD:** Write tests for conversion logic before implementation.
- **Surgical Changes:** Minimize diffs and maintain existing architectural patterns.
- **Performance:** Be mindful of Cloudflare Worker CPU and Memory limits (especially during complex
  markdown parsing).

## Key Files & Directories

- `src/index.ts`: Main entry point and router.
- `src/mcp/`: MCP protocol and tool definitions.
- `src/converter/`: Core markdown conversion logic.
- `src/auth/`: OAuth flow and token management.
- `src/security/`: Encryption and rate-limiting.
