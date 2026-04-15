# Gemini CLI Development Guidelines — Google Docs MCP Server

## Project Progress: ✅ All Tasks Complete (T001-T035)

The MVP development is complete. All user stories (Auth, Read/Write, Section Updates) are implemented and verified via unit and integration tests. The server is ready for production use on Cloudflare Workers.

---

## Active Technologies

- **Runtime**: Cloudflare Workers
- **Framework**: Model Context Protocol (MCP) SDK
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
- `wrangler deploy`: Deploy to Cloudflare
- `wrangler secret put <KEY>`: Set environment secrets

### 1. Research → Strategy → Execution Lifecycle

- **Research:** Always start by validating assumptions about the Google Docs API and Cloudflare Worker environment.
- **Strategy:** Provide a concise summary of your plan before making changes.
- **Execution:** Implement changes surgically, following the project's two-pass conversion algorithm.

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
