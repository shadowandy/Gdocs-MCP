# Gemini CLI Development Guidelines — Google Docs MCP Server

## Project Progress: ✅ MVP Complete & CI Enabled

The MVP development is complete. All user stories (Auth, Read/Write, Section Updates) are implemented and verified. A GitHub Actions CI pipeline is active for automated testing, linting, and type-checking.

---

## Active Technologies

- TypeScript / ESNex + Cloudflare Workers, @modelcontextprotocol/sdk (001-passphrase-in-path)
- Cloudflare KV (GDOCS_TOKENS, GDOCS_SESSIONS, GDOCS_RATELIMIT) (001-passphrase-in-path)

- **Runtime**: Cloudflare Workers
- **Framework**: Model Context Protocol (MCP) SDK
- **CI/CD**: GitHub Actions
- **APIs**: Google Docs, Google Drive
- **Storage**: Cloudflare KV
- **Testing**: Vitest, Miniflare
- **Security**: AES-256-GCM (Web Crypto)

## Project Structure

```text
src/
├── mcp/        # MCP Protocol & SSE Transport
├── auth/       # OAuth2 & Token Storage (KV)
├── google/     # Docs/Drive API Integration
├── converter/  # Markdown <-> Docs Engine
├── security/   # Encryption & Rate Limiting
└── utils/      # Helpers & Errors
```

## Commands

- `npm run dev`: Local development via Wrangler
- `npm test`: Run Vitest tests
- `npm run lint`: Run ESLint checks
- `npm run typecheck`: Run TypeScript type checks
- `npm run format`: Format code with Prettier
- `wrangler deploy`: Deploy to Cloudflare
- `wrangler secret put <KEY>`: Set environment secrets

### 1. Research → Strategy → Execution Lifecycle

- **Research:** Always start by validating assumptions about the Google Docs API and Cloudflare Worker environment.
- **Strategy:** Provide a concise summary of your plan before making changes.
- **Execution:** Implement changes surgically, following the project's two-pass conversion algorithm. Ensure all MCP connection URLs follow the path-based authentication pattern: `/mcp/{passphrase}/sse`.

### 2. Testing & Validation

- **Local Testing:** Use `vitest` or `miniflare` for Cloudflare Worker local testing.
- **Reproduction:** For bug fixes, always reproduce the issue with a test case first.
- **Formatting:** Ensure Markdown-to-Docs conversion is tested against complex edge cases (nested lists, overlapping styles).

### 3. Tool Usage

- **Wrangler:** Use `wrangler` for local development and deployment.
- **Secret Management:** Never log or commit secrets like `GOOGLE_CLIENT_SECRET` or `ENCRYPTION_KEY`. Use `wrangler secret put` instead.

### 4. Code Style & Patterns

- **TypeScript:** Use strict types for all MCP tool definitions and converter state.
- **Functional Patterns:** Prefer pure functions for conversion logic to simplify testing.
- **Error Handling:** Use custom error types defined in `src/utils/errors.ts`.

## Contextual Precedence

This document (`GEMINI.md`) takes absolute precedence over general defaults for Gemini CLI within this workspace. Follow these instructions to ensure seamless, idiomatic, and consistent project updates.

## Recent Changes

- 001-passphrase-in-path: Added TypeScript / ESNex + Cloudflare Workers, @modelcontextprotocol/sdk
