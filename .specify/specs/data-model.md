# Data Model: Google Docs MCP Server

## Entities

### `UserSession` (Transient)
- **Key**: `session:{state}` (in Cloudflare KV)
- **Attributes**:
  - `state`: String (cryptographically random)
  - `passphrase`: String (generated)
  - `createdAt`: Number (timestamp)
- **TTL**: 600 seconds (10 minutes)
- **Purpose**: Manage the OAuth2 state verification flow.

### `UserCredentials` (Persistent)
- **Key**: `tokens:{passphrase}` (in Cloudflare KV)
- **Attributes**:
  - `access_token`: String (encrypted)
  - `refresh_token`: String (encrypted)
  - `expiry`: Number (timestamp, absolute)
  - `email`: String (user identity)
- **Metadata**:
  - `lastModified`: Number (timestamp for CAS)
- **Purpose**: Store user-specific encrypted tokens for document access.

### `RateLimitState` (Transient)
- **Key**: `ratelimit:{passphrase}:{minute}`
- **Attributes**:
  - `count`: Number
- **TTL**: 120 seconds
- **Purpose**: Track per-minute request counts.

### `LockoutState` (Transient)
- **Key**: `lockout:{passphrase}`
- **Attributes**:
  - `lockoutUntil`: Number (timestamp)
- **TTL**: 300 seconds (5 minutes)
- **Purpose**: Block access after 10 failed attempts.

## State Transitions

### Authentication Flow
1. **Unregistered**: User visits `/auth/register`.
2. **Pending**: `UserSession` created; user at Google consent.
3. **Registered**: OAuth callback validates state; `UserCredentials` created; `UserSession` deleted.

### Tool Execution Flow
1. **Validated**: Check `RateLimitState` and `LockoutState`.
2. **Authorized**: Load and decrypt `UserCredentials`.
3. **Active**: Check token expiry; refresh if needed via Google OAuth2.
4. **Execution**: Call Google Docs API with `access_token`.
