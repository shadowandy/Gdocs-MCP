---
description: "Task list for Google Docs MCP Server implementation"
---

# Tasks: Google Docs MCP Server

**Input**: Design documents from `.specify/specs/` and `.specify/plans/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Cloudflare Workers project with `wrangler init`
- [X] T002 Install dependencies: `@modelcontextprotocol/sdk`, `googleapis`, `zod`, `vitest`, `miniflare`, `jose`
- [X] T003 [P] Configure ESLint and Prettier for TypeScript and Cloudflare Workers
- [X] T004 [P] Configure `wrangler.toml` with KV namespaces: `GDOCS_TOKENS`, `GDOCS_SESSIONS`, `GDOCS_RATELIMIT`
- [X] T005 Create directory structure per implementation plan (src/mcp, src/auth, src/google, src/converter, src/security, src/utils)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Implement AES-256-GCM encryption/decryption using Web Crypto API in `src/security/encryption.ts`
- [X] T007 Implement Custom Error types and Structured JSON logging in `src/utils/errors.ts`
- [X] T008 [P] Implement document URL regex validation in `src/security/url-validator.ts`
- [X] T009 [P] Implement per-passphrase rate limiting and 10-attempt lockout logic in `src/security/rate-limiter.ts`
- [X] T010 Setup API routing and MCP SSE transport skeleton in `src/index.ts` and `src/mcp/server.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Registration & Authentication (Priority: P1) 🎯 MVP

**Goal**: Enable users to securely connect their Google accounts and receive a passphrase

**Independent Test**: Visit `/auth/register`, complete Google OAuth flow, and receive a unique passphrase that retrieves encrypted tokens from KV.

### Tests for User Story 1

- [X] T011 [P] [US1] Unit test for passphrase generation in `tests/auth.test.ts`
- [X] T012 [P] [US1] Integration test for OAuth state verification in `tests/auth.test.ts`

### Implementation for User Story 1

- [X] T013 [P] [US1] Implement passphrase generation using wordlist in `src/auth/passphrase.ts` and `src/utils/wordlist.ts`
- [X] T014 [US1] Implement Google OAuth2 registration redirect in `src/auth/oauth.ts`
- [X] T015 [US1] Implement OAuth2 callback handler with state validation in `src/auth/oauth.ts`
- [X] T016 [US1] Implement token encryption, storage (KV), and CAS refresh logic in `src/auth/tokens.ts`
- [X] T017 [US1] Implement `/auth/register`, `/auth/callback`, and `/auth/status/{passphrase}` endpoints in `src/index.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Basic Document Reading & Writing (Priority: P2)

**Goal**: Enable Claude.ai to read and write Google Docs using Markdown

**Independent Test**: Connect Claude.ai to the SSE endpoint and execute `google_docs_read` and `google_docs_write` tools.

### Tests for User Story 2

- [X] T018 [P] [US2] Unit test for two-pass Markdown-to-Docs conversion in `tests/converter.test.ts`
- [X] T019 [P] [US2] Unit test for Docs-to-Markdown conversion in `tests/converter.test.ts`

### Implementation for User Story 2

- [X] T020 [US2] Implement two-pass Markdown-to-Docs conversion (Pass 1: Text, Pass 2: Styles) in `src/converter/md-to-docs.ts`
- [X] T021 [US2] Implement validation for Google Docs API request/character limits in `src/converter/md-to-docs.ts`
- [X] T022 [P] [US2] Implement Docs-to-Markdown conversion logic in `src/converter/docs-to-md.ts`
- [X] T023 [P] [US2] Implement GFM table conversion logic in `src/converter/table-handler.ts`
- [X] T024 [US2] Register `google_docs_read` and `google_docs_write` tools in `src/mcp/tools.ts`
- [X] T025 [US2] Implement Google API integration for reading/writing in `src/google/docs-read.ts` and `src/google/docs-write.ts`
- [X] T026 [US2] Implement MCP SSE transport and message handling in `src/mcp/server.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Precision Section Updates (Priority: P3)

**Goal**: Update specific sections of a document without a full rewrite

**Independent Test**: Call `google_docs_update_section` with a heading and verify only the content under it is modified.

### Tests for User Story 3

- [X] T027 [P] [US3] Unit test for section-finding algorithm in `tests/tools.test.ts`
- [X] T028 [P] [US3] Integration test for section update tool in `tests/tools.test.ts`

### Implementation for User Story 3

- [X] T029 [US3] Implement section-finding and content replacement logic in `src/google/docs-section.ts`
- [X] T030 [US3] Register `google_docs_update_section` tool in `src/mcp/tools.ts`
- [X] T031 [US3] Integrate section update tool with the converter and Google API in `src/google/docs-section.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T032 Finalize API documentation and usage guide in `README.md`
- [X] T033 [P] Run all tests and verify SC-001 to SC-005 measurable outcomes
- [X] T034 [P] Security audit of token isolation and encryption logic
- [X] T035 [P] Run `quickstart.md` validation flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Phase 2
  - US1 (P1) is prioritized as MVP
  - US2 (P2) depends on US1 for authentication context
  - US3 (P3) depends on US2 for conversion logic

### Parallel Opportunities

- T003, T004 can run in parallel
- T008, T009 can run in parallel
- T011, T012 can run in parallel
- T013, T014 can run in parallel (if US1 started)
- T018, T019, T022, T023 can run in parallel (within US2)
- T027, T028 can run in parallel (within US3)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test authentication and passphrase generation

### Incremental Delivery

1. Foundation ready
2. Add User Story 1 → Test independently → MVP!
3. Add User Story 2 → Test independently → Core value delivered
4. Add User Story 3 → Test independently → Optimization complete
