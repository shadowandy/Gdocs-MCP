# Implementation Plan: Google Docs MCP Server

**Branch**: `001-gdocs-mcp-server` | **Date**: 2026-04-15 | **Spec**: `.specify/specs/gdocs-mcp-server.md`
**Input**: Feature specification from `.specify/specs/gdocs-mcp-server.md`

## Summary

A multi-tenant MCP server for Cloudflare Workers that enables Claude.ai to read and write Google Docs via the Google Docs API. The solution uses a secure, passphrase-based authentication model with encrypted token storage in Cloudflare KV and a high-fidelity two-pass Markdown-to-Docs conversion engine.

## Technical Context

**Language/Version**: TypeScript / ES2022 (Cloudflare Workers)  
**Primary Dependencies**: `@modelcontextprotocol/sdk`, `googleapis`, `zod`, `jose`  
**Storage**: Cloudflare KV (`GDOCS_TOKENS`, `GDOCS_SESSIONS`, `GDOCS_RATELIMIT`)  
**Testing**: `vitest`, `miniflare`  
**Target Platform**: Cloudflare Workers  
**Project Type**: Web Service (MCP over SSE)  
**Performance Goals**: 30 req/min per user; <200ms API overhead  
**Constraints**: 10-attempt lockout; AES-256-GCM encryption; Last Write Wins; 128MB Memory Limit  
**Scale/Scope**: Multi-tenant; Supports GFM Tables, Lists, and Formatting

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Security & Privacy First**: PASS (AES-256-GCM, passphrase entropy, lockout logic).
- **II. Serverless & Global Scalability**: PASS (Cloudflare Workers/KV).
- **III. Native Claude.ai Integration**: PASS (MCP/SSE transport).
- **IV. Markdown-to-Docs Fidelity**: PASS (batchUpdate implementation).
- **V. Robust Two-Pass Conversion Algorithm**: PASS (Explicitly mandated in spec and tasks).

## Project Structure

### Documentation (this feature)

```text
.specify/specs/
├── gdocs-mcp-server.md  # Feature Specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks/               # Tasks for this feature
```

### Source Code (repository root)

```text
src/
├── index.ts                 # Worker entry, request router
├── mcp/
│   ├── server.ts            # MCP protocol handler (SSE transport)
│   ├── tools.ts             # Tool definitions and dispatch
│   └── types.ts             # MCP type definitions
├── auth/
│   ├── oauth.ts             # Google OAuth2 flow
│   ├── passphrase.ts        # Passphrase generation
│   └── tokens.ts            # Token encryption, storage, refresh
├── google/
│   ├── docs-read.ts         # Read doc → markdown
│   ├── docs-write.ts        # Write markdown → doc
│   └── docs-section.ts      # Section-level updates
├── converter/
│   ├── md-to-docs.ts        # Markdown → Docs API requests
│   ├── docs-to-md.ts        # Docs structure → markdown
│   ├── table-handler.ts     # Markdown table parsing + Docs table creation
│   └── style-map.ts         # Markdown element → Docs style mapping
├── security/
│   ├── encryption.ts        # AES-256-GCM encrypt/decrypt
│   ├── rate-limiter.ts      # Per-passphrase rate limiting
│   └── url-validator.ts     # Google Docs URL validation
└── utils/
    ├── wordlist.ts          # 2048-word list for passphrases
    └── errors.ts            # Error types and handlers

tests/
├── converter.test.ts
├── auth.test.ts
├── tools.test.ts
└── integration/
```

**Structure Decision**: Single project structure using Cloudflare Workers directory patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(No violations detected)
