# Implementation Plan: Passphrase in URL Path

**Branch**: `001-passphrase-in-path` | **Date**: 2026-04-15 | **Spec**: [specs/001-passphrase-in-path/spec.md](specs/001-passphrase-in-path/spec.md)

## Summary

Migrate MCP SSE and message endpoints to include the user's passphrase as a path segment instead of a query parameter. This improves security by reducing exposure in logs and aligns with RESTful resource naming.

## Technical Context

**Language/Version**: TypeScript / ESNext
**Primary Dependencies**: Cloudflare Workers, @modelcontextprotocol/sdk
**Storage**: Cloudflare KV (GDOCS_TOKENS, GDOCS_SESSIONS, GDOCS_RATELIMIT)
**Testing**: Vitest
**Target Platform**: Cloudflare Workers
**Project Type**: MCP Server (Web Service)
**Performance Goals**: N/A (Low overhead change)
**Constraints**: <1ms routing overhead
**Scale/Scope**: Impacts all connected MCP clients.

## Constitution Check

| Principle                           | Check                                            | Status  |
| ----------------------------------- | ------------------------------------------------ | ------- |
| I. Security & Privacy First         | Moving credentials to path reduces log exposure. | ✅ Pass |
| II. Serverless & Global Scalability | No impact on serverless nature.                  | ✅ Pass |
| III. Native Claude.ai Integration   | Maintains MCP compatibility.                     | ✅ Pass |
| IV. Markdown-to-Docs Fidelity       | No impact.                                       | ✅ Pass |
| V. Robust Two-Pass Conversion       | No impact.                                       | ✅ Pass |

## Project Structure

### Documentation (this feature)

```text
specs/001-passphrase-in-path/
├── plan.md              # This file
├── research.md          # Strategy & Rationale
├── data-model.md        # URL Entity & Validation
├── quickstart.md        # Migration guide
└── contracts/
    └── api.md           # New endpoint definitions
```

### Source Code (repository root)

```text
src/
├── index.ts             # Update routing logic in fetch handler
└── mcp/
    └── server.ts        # Update handleMcpSseRequest and transport init
```

**Structure Decision**: Standard single project structure. We will modify `src/index.ts` to implement the new routing pattern and `src/mcp/server.ts` to handle the transport initialization with the new path-based message endpoint.
