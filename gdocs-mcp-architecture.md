# Google Docs MCP Server — Solution Architecture

## 1. Overview

A multi-tenant MCP (Model Context Protocol) server running on Cloudflare Workers that enables Claude.ai to read and write Google Docs. Users authenticate via Google OAuth2, and the server converts markdown content from Claude into native Google Docs formatting via the Google Docs API.

### Key design decisions

| Decision       | Choice                                          | Rationale                                                    |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| Runtime        | Cloudflare Workers                              | Serverless, globally distributed, zero cold start            |
| Auth model     | Google OAuth2 (Authorization Code + PKCE)       | Works with any doc the user can access                       |
| Transport      | MCP over SSE                                    | Native Claude.ai integration                                 |
| User identity  | Passphrase in URL path                          | No shared bearer token, easy to remember, hard to bruteforce |
| Token storage  | Cloudflare KV with application-layer encryption | Encrypted at rest + encrypted by us                          |
| Content format | Markdown → Google Docs API `batchUpdate`        | Claude writes markdown; Worker handles conversion            |
| Multi-tenancy  | Passphrase-scoped token isolation               | Each user has independent credentials                        |

---

## 2. Component Architecture

### 2.1 URL routes

```
GET  /auth/register                → Generate passphrase, redirect to Google OAuth2
GET  /auth/callback                → Handle OAuth2 callback, store tokens
GET  /auth/status/{passphrase}     → Check if user is authenticated
GET  /mcp/{passphrase}/sse         → MCP SSE endpoint (Claude.ai connects here)
POST /mcp/{passphrase}/messages    → MCP message handler
```

### 2.2 MCP tools exposed

#### `google_docs_read`

```json
{
  "name": "google_docs_read",
  "description": "Read the contents of a Google Doc and return as markdown",
  "inputSchema": {
    "type": "object",
    "properties": {
      "doc_url": {
        "type": "string",
        "description": "Full Google Docs URL (e.g. https://docs.google.com/document/d/DOC_ID/edit)"
      }
    },
    "required": ["doc_url"]
  }
}
```

#### `google_docs_write`

```json
{
  "name": "google_docs_write",
  "description": "Write markdown content to a Google Doc. Converts markdown to native Docs formatting (headings, bold, italic, lists, tables, links, code, horizontal rules, unicode symbols).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "doc_url": {
        "type": "string",
        "description": "Full Google Docs URL"
      },
      "content": {
        "type": "string",
        "description": "Markdown content to write"
      },
      "mode": {
        "type": "string",
        "enum": ["replace", "append"],
        "description": "replace = clear doc and write; append = add to end of doc"
      }
    },
    "required": ["doc_url", "content", "mode"]
  }
}
```

#### `google_docs_update_section`

```json
{
  "name": "google_docs_update_section",
  "description": "Find a section by its heading text and replace everything under it until the next heading of the same or higher level.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "doc_url": {
        "type": "string",
        "description": "Full Google Docs URL"
      },
      "section_heading": {
        "type": "string",
        "description": "Exact text of the heading to find"
      },
      "content": {
        "type": "string",
        "description": "New markdown content for this section (excluding the heading itself)"
      }
    },
    "required": ["doc_url", "section_heading", "content"]
  }
}
```

---

## 3. Authentication Flow

### 3.1 One-time user registration

```
User Browser                    CF Worker                Google OAuth2
    │                              │                          │
    │  GET /auth/register          │                          │
    │─────────────────────────────►│                          │
    │                              │                          │
    │                    Generate passphrase                  │
    │                    e.g. "tiger-maple-7-cloud"           │
    │                    Store state in KV (TTL 10m)          │
    │                              │                          │
    │  302 → Google consent screen │                          │
    │◄─────────────────────────────│                          │
    │                              │                          │
    │  User grants consent ────────────────────────────────►  │
    │                              │                          │
    │                              │  GET /auth/callback      │
    │                              │  ?code=...&state=...     │
    │                              │◄─────────────────────────│
    │                              │                          │
    │                    Validate state                       │
    │                    Exchange code for tokens             │
    │                    Encrypt tokens                       │
    │                    Store in KV: tokens:{passphrase}     │
    │                              │                          │
    │  HTML: "Setup complete!"     │                          │
    │  "Your passphrase is:        │                          │
    │   tiger-maple-7-cloud"       │                          │
    │  "Add this MCP URL to        │                          │
    │   Claude.ai Settings"        │                          │
    │◄─────────────────────────────│                          │
```

### 3.2 Passphrase generation

Format: `{word}-{word}-{digit}-{word}` from a curated 2048-word list.

- Entropy: log2(2048³ × 10) ≈ 36 bits from words + 3.3 bits from digit ≈ 39 bits
- With rate limiting (30 req/min), brute-force at full speed would take ~17,000 years
- Easy to remember: "tiger-maple-7-cloud"
- Easy to type on mobile

### 3.3 Runtime token usage

```
Claude.ai                       CF Worker                    Google APIs
    │                              │                            │
    │  MCP tool call               │                            │
    │  (via /mcp/{pass}/sse)       │                            │
    │─────────────────────────────►│                            │
    │                              │                            │
    │                    Validate passphrase                    │
    │                    Load tokens from KV                    │
    │                    Decrypt tokens                         │
    │                    Check expiry                           │
    │                    (refresh if needed)                    │
    │                              │                            │
    │                              │  API call with access_token│
    │                              │───────────────────────────►│
    │                              │                            │
    │                              │  Response                  │
    │                              │◄───────────────────────────│
    │                              │                            │
    │  MCP tool result             │                            │
    │◄─────────────────────────────│                            │
```

---

## 4. Markdown → Google Docs Conversion

The Google Docs API operates on `batchUpdate` with a list of requests. Each request operates on character indices within the document. The converter must:

1. Parse markdown into an AST (abstract syntax tree)
2. Generate `insertText` requests for content
3. Generate `updateParagraphStyle` requests for headings
4. Generate `updateTextStyle` requests for bold, italic, code, links
5. Generate `insertTable` requests for tables
6. Handle unicode symbols natively (they're just text)

### 4.1 Supported conversions

| Markdown            | Google Docs equivalent                                 |
| ------------------- | ------------------------------------------------------ |
| `# Heading 1`       | `HEADING_1` paragraph style                            |
| `## Heading 2`      | `HEADING_2` paragraph style                            |
| `### Heading 3`     | `HEADING_3` paragraph style                            |
| `**bold**`          | `bold: true` text style                                |
| `*italic*`          | `italic: true` text style                              |
| `` `inline code` `` | `weightedFontFamily: "Courier New"` text style         |
| `[text](url)`       | `link: { url }` text style                             |
| `- item`            | `BULLET_DISC_CIRCLE_SQUARE` preset                     |
| `1. item`           | `NUMBERED_DECIMAL_ALPHA_ROMAN` preset                  |
| `\| table \|`       | `insertTable` + cell content                           |
| ` ``` code ``` `    | Monospace paragraph with background colour             |
| `---`               | `insertPageBreak` or horizontal rule via special chars |
| Unicode symbols     | Direct text insertion (no conversion needed)           |

### 4.2 Conversion strategy

The converter works in **two passes**:

**Pass 1 — Insert all text (plain, stripped of markdown syntax)**

- Walk the AST, concatenate all text content
- Insert as a single `insertText` request at the target index
- This establishes the character index map

**Pass 2 — Apply formatting**

- Walk the AST again, this time emitting style requests
- Each style request references the character range from Pass 1
- Requests are ordered by descending index (Google Docs API requirement: later indices first to avoid shifting)

**Tables** are handled separately:

- `insertTable` at the target index with row/column counts
- Then `insertText` into each cell by navigating the document structure
- Cell content supports inline formatting (bold, italic, links)

### 4.3 Section update algorithm

For `google_docs_update_section`:

1. `documents.get` to retrieve the full document structure
2. Walk the `body.content` array to find the paragraph matching `section_heading` with a heading style
3. Record its `startIndex`
4. Continue walking to find the next heading of the same or higher level (e.g., if section is H2, find next H1 or H2)
5. Record that `startIndex` as the section end
6. `deleteContentRange` from section start (after the heading) to section end
7. Insert new content at the deletion point using the markdown converter

---

## 5. Security Architecture

### 5.1 Threat model and mitigations

| Threat                         | Mitigation                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Passphrase brute-force         | Rate limiting: 30 req/min per IP + passphrase lockout after 10 failed attempts in 5 min |
| Token theft from KV            | Application-layer AES-256-GCM encryption using Worker secret as key                     |
| OAuth2 state hijacking         | Cryptographically random state, KV-stored with 10-min TTL, validated on callback        |
| Document URL injection / SSRF  | Strict regex: extract doc ID from `docs.google.com/document/d/{id}` only                |
| Google scope over-provisioning | Minimal scopes: `documents` + `drive.file`                                              |
| Token refresh race condition   | Compare-and-swap pattern: check if token was already refreshed before writing           |
| Passphrase exposure in logs    | Worker binding: never log the passphrase or tokens                                      |
| MCP endpoint abuse             | Passphrase in URL path validated before any processing                                  |

### 5.2 Token encryption

```
Encryption:
  plaintext = JSON.stringify({ access_token, refresh_token, expiry, email })
  iv = crypto.getRandomValues(12 bytes)
  key = AES-256-GCM key derived from ENCRYPTION_SECRET (Worker secret)
  ciphertext = AES-GCM-encrypt(key, iv, plaintext)
  stored_value = base64(iv + ciphertext)

Decryption:
  decoded = base64-decode(stored_value)
  iv = decoded[0..11]
  ciphertext = decoded[12..]
  plaintext = AES-GCM-decrypt(key, iv, ciphertext)
  tokens = JSON.parse(plaintext)
```

### 5.3 KV namespace structure

| Key pattern                       | Value                                                      | TTL               |
| --------------------------------- | ---------------------------------------------------------- | ----------------- |
| `tokens:{passphrase}`             | Encrypted `{ access_token, refresh_token, expiry, email }` | None (persistent) |
| `sessions:{state}`                | `{ passphrase, created_at }`                               | 600s (10 min)     |
| `ratelimit:{passphrase}:{minute}` | Request count                                              | 120s (2 min)      |
| `lockout:{passphrase}`            | Lockout timestamp                                          | 300s (5 min)      |

---

## 6. Cloudflare Configuration

### 6.1 `wrangler.toml`

```toml
name = "gdocs-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[vars]
GOOGLE_CLIENT_ID = "" # Set via wrangler.toml or dashboard
GOOGLE_REDIRECT_URI = "https://gdocs-mcp.yourdomain.workers.dev/auth/callback"

[[kv_namespaces]]
binding = "KV"
id = "<your-kv-namespace-id>"

# Secrets (set via `wrangler secret put`):
# GOOGLE_CLIENT_SECRET
# ENCRYPTION_KEY (32-byte hex string for AES-256)
```

### 6.2 Worker secrets

| Secret                 | Purpose                                          | How to set                                 |
| ---------------------- | ------------------------------------------------ | ------------------------------------------ |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret from GCP                    | `wrangler secret put GOOGLE_CLIENT_SECRET` |
| `ENCRYPTION_KEY`       | 32-byte hex key for AES-256-GCM token encryption | `wrangler secret put ENCRYPTION_KEY`       |

Generate the encryption key:

```bash
openssl rand -hex 32
```

---

## 7. Google Cloud Project Setup

### Step 1: Create project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Claude Docs MCP")
3. Note the project ID

### Step 2: Enable APIs

1. Navigate to **APIs & Services → Library**
2. Enable **Google Docs API**
3. Enable **Google Drive API** (needed for `drive.file` scope to check doc access)

### Step 3: Configure OAuth consent screen

1. Navigate to **APIs & Services → OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in:
   - App name: "Claude Docs MCP"
   - User support email: your email
   - Authorised domains: `yourdomain.workers.dev`
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/drive.file`
5. Add test users (yourself, family members) — required while app is in "Testing" status

### Step 4: Create OAuth2 credentials

1. Navigate to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: "CF Worker MCP"
5. Authorised redirect URIs: `https://gdocs-mcp.yourdomain.workers.dev/auth/callback`
6. Save the **Client ID** and **Client Secret**

### Step 5: Publish (optional)

While in "Testing" status, only listed test users can authenticate. For family/friends:

- Either add them all as test users (easiest, no review needed)
- Or submit for verification (takes days/weeks, overkill for personal use)

---

## 8. Project Structure

```
gdocs-mcp-server/
├── wrangler.toml
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Worker entry, request router
│   ├── mcp/
│   │   ├── server.ts            # MCP protocol handler (SSE transport)
│   │   ├── tools.ts             # Tool definitions and dispatch
│   │   └── types.ts             # MCP type definitions
│   ├── auth/
│   │   ├── oauth.ts             # Google OAuth2 flow
│   │   ├── passphrase.ts        # Passphrase generation
│   │   └── tokens.ts            # Token encryption, storage, refresh
│   ├── google/
│   │   ├── docs-read.ts         # Read doc → markdown
│   │   ├── docs-write.ts        # Write markdown → doc
│   │   └── docs-section.ts      # Section-level updates
│   ├── converter/
│   │   ├── md-to-docs.ts        # Markdown → Docs API requests
│   │   ├── docs-to-md.ts        # Docs structure → markdown
│   │   ├── table-handler.ts     # Markdown table parsing + Docs table creation
│   │   └── style-map.ts         # Markdown element → Docs style mapping
│   ├── security/
│   │   ├── encryption.ts        # AES-256-GCM encrypt/decrypt
│   │   ├── rate-limiter.ts      # Per-passphrase rate limiting
│   │   └── url-validator.ts     # Google Docs URL validation
│   └── utils/
│       ├── wordlist.ts          # 2048-word list for passphrases
│       └── errors.ts            # Error types and handlers
└── test/
    ├── converter.test.ts
    ├── auth.test.ts
    └── tools.test.ts
```

---

## 9. Claude.ai Integration

### For each user:

1. Visit `https://gdocs-mcp.yourdomain.workers.dev/auth/register` in their browser
2. Complete Google OAuth2 consent
3. Receive their passphrase (e.g., `tiger-maple-7-cloud`)
4. In Claude.ai: **Settings → Connectors → Add Custom MCP Server**
5. Enter URL: `https://gdocs-mcp.yourdomain.workers.dev/mcp/tiger-maple-7-cloud/sse`
6. Done — Claude can now use the Google Docs tools

### Example usage in Claude:

> **User**: "Write this trip itinerary to my Google Doc: https://docs.google.com/document/d/1abc.../edit"
>
> **Claude**: _Calls `google_docs_write` with the itinerary markdown, mode="replace"_
>
> **User**: "Update just the Day 3 section with the revised restaurant list"
>
> **Claude**: _Calls `google_docs_update_section` with section_heading="Day 3" and new content_

---

## 10. Deployment Checklist

1. **GCP**: Create project, enable APIs, configure OAuth consent, create credentials
2. **Cloudflare**: Create KV namespace via `wrangler kv:namespace create GDOCS_MCP`
3. **Secrets**: Set `GOOGLE_CLIENT_SECRET` and `ENCRYPTION_KEY` via `wrangler secret put`
4. **Config**: Update `wrangler.toml` with KV namespace ID and Google Client ID
5. **Deploy**: `wrangler deploy`
6. **Test**: Visit `/auth/register`, complete OAuth, verify MCP connection in Claude.ai
7. **Onboard users**: Share the `/auth/register` URL with family/friends

---

## 11. Limitations and Future Considerations

### Current limitations

- **Images**: Google Docs API cannot insert images via `batchUpdate` from markdown `![](url)` syntax. Would require Drive API upload + `insertInlineImage`.
- **Complex tables**: Merged cells and nested tables are not supported.
- **Comments/suggestions**: Read-only; creating suggestions requires additional scope.
- **Real-time collaboration**: The Worker does a read-modify-write; concurrent edits by other users between read and write could cause conflicts.

### Future enhancements

- **Image insertion**: Upload images to Drive, then insert into doc
- **Template support**: Pre-defined doc templates (trip itinerary, meeting notes, etc.)
- **Batch operations**: Write to multiple docs in one tool call
- **Version history**: Tag doc versions after each write for rollback
- **Webhook notifications**: Notify user via Slack/email when a doc is updated by Claude
