# Tasks: Passphrase in URL Path

**Input**: Design documents from `/specs/001-passphrase-in-path/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test preparation

- [x] T001 [P] Create reproduction/integration test for path-based authentication in `tests/integration/path_auth.test.ts`
- [x] T002 [P] Update `src/utils/errors.ts` to include any new error types needed for malformed paths (optional)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic updates that MUST be complete before the main user story

- [x] T003 Update `handleMcpSseRequest` signature in `src/mcp/server.ts` to accept `passphrase` as an argument
- [x] T004 Implement path parsing regex or logic in `src/index.ts` to identify `/mcp/{passphrase}/{endpoint}`

---

## Phase 3: User Story 1 - Secure Connection via Path-Based Passphrase (Priority: P1) 🎯 MVP

**Goal**: Establish MCP connection using the new path-based URL format and ensure legacy format is rejected.

**Independent Test**: Establish an SSE connection using `.../mcp/valid-passphrase/sse` and verify it succeeds, while `.../mcp/sse?passphrase=...` fails.

### Implementation for User Story 1

- [x] T005 [US1] Update `SSEServerTransport` initialization in `src/mcp/server.ts` to use `/mcp/${passphrase}/messages` as the message endpoint
- [x] T006 [US1] Update `src/index.ts` fetch handler to route `/mcp/{passphrase}/sse` to `handleMcpSseRequest`
- [x] T007 [US1] Update `src/index.ts` fetch handler to route `/mcp/{passphrase}/messages` to `server.handleMessage` (via transport)
- [x] T008 [US1] Remove legacy routing for `/mcp/sse` and `/mcp/messages` in `src/index.ts`
- [x] T009 [US1] Implement explicit rejection (401/404) for query-based passphrase attempts in `src/index.ts`
- [x] T010 [US1] Verify all US1 requirements using the integration test in `tests/integration/path_auth.test.ts`

**Checkpoint**: At this point, the core path-based authentication is fully functional and tested.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final verification

- [x] T011 [P] Update `README.md` with new connection instructions for Claude Web and Desktop
- [x] T012 [P] Update `CLAUDE.md` and `GEMINI.md` to reflect the change in connection protocol
- [x] T013 Run full project verification: `npm run format && npm run lint && npm run typecheck && npm test`
- [x] T014 [P] Run quickstart.md validation manually to ensure migration instructions are clear

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 for test structure.
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion.
- **Polish (Final Phase)**: Depends on User Story 1 being verified.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T011, T012, and T014 can run in parallel once US1 is complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational tasks.
2. Complete User Story 1 (T005-T010).
3. **STOP and VALIDATE**: Ensure SSE connection works with the new path format.
4. Update documentation (T011-T012).

---

## Notes

- **Breaking Change**: This is an immediate migration. No backwards compatibility is maintained for query parameters.
- **Security**: Moving the passphrase to the path segment improves privacy in server logs.
- **MCP SDK**: Ensure `SSEServerTransport` is correctly re-initialized with the session-specific message endpoint.
