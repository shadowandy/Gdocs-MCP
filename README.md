# 📘 Google Docs MCP Server: The Complete Setup Guide

This guide will help you set up your own private Google Docs MCP server on Cloudflare Workers. Once finished, Claude.ai will be able to read, write, and update your Google Docs directly.

---

## 🏗️ Phase 1: Prerequisites

Before we start, make sure you have the following:
1. **A Google Account**: To access Google Docs.
2. **A Cloudflare Account**: [Sign up here](https://dash.cloudflare.com/sign-up) (The free tier is perfectly fine).
3. **Node.js installed**: [Download here](https://nodejs.org/) (Choose the "LTS" version).
4. **Git installed**: [Download here](https://git-scm.com/downloads).

---

## 🚀 Phase 2: Get the Code & Install Tools

Open your terminal (Command Prompt on Windows, Terminal on Mac) and run these commands:

1. **Clone the project:**
   ```bash
   git clone https://github.com/your-username/gdocs-mcp.git
   cd gdocs-mcp
   ```

2. **Install the project dependencies:**
   ```bash
   npm install
   ```

3. **Login to Cloudflare:**
   This will open a browser window to authenticate your computer with your Cloudflare account.
   ```bash
   npx wrangler login
   ```

---

## 🔑 Phase 3: Google API Setup

You need to tell Google that your MCP server is allowed to talk to your documents.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. **Create a New Project**: Give it a name like "My MCP Server".
3. **Enable APIs**:
   - Search for **"Google Docs API"** and click **Enable**.
   - Search for **"Google Drive API"** and click **Enable**.
4. **Configure OAuth Consent Screen**:
   - Select **External**.
   - Fill in the App Name and your Email.
   - Add the scope: `.../auth/documents` and `.../auth/drive.readonly`.
   - **Important**: Add your own email as a "Test User".
5. **Create Credentials**:
   - Click **Create Credentials** -> **OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs**: Add `https://gdocs-mcp.your-subdomain.workers.dev/auth/callback` (Replace `your-subdomain` with your Cloudflare username later, or update this after Phase 5).
   - Copy your **Client ID** and **Client Secret**.

---

## 🛠️ Phase 4: Configure Secrets

Cloudflare needs these keys to securely communicate with Google. Replace the placeholders with your actual keys:

```bash
# Your Google Client ID from Phase 3
npx wrangler secret put GOOGLE_CLIENT_ID

# Your Google Client Secret from Phase 3
npx wrangler secret put GOOGLE_CLIENT_SECRET

# The same Redirect URI you entered in Phase 3
npx wrangler secret put REDIRECT_URI

# A random long string for encryption (e.g., 32 characters)
npx wrangler secret put ENCRYPTION_KEY
```

---

## ☁️ Phase 5: Create Storage & Deploy

1. **Create the KV Namespaces (Databases):**
   Run these three commands and **copy the ID** provided for each:
   ```bash
   npx wrangler kv:namespace create GDOCS_TOKENS
   npx wrangler kv:namespace create GDOCS_SESSIONS
   npx wrangler kv:namespace create GDOCS_RATELIMIT
   ```

2. **Update `wrangler.toml`:**
   Open the `wrangler.toml` file in your code editor and paste the IDs you just copied into the corresponding `id = "..."` fields.

3. **Deploy to Cloudflare:**
   ```bash
   npx wrangler deploy
   ```
   *Take note of the URL provided at the end (e.g., `https://gdocs-mcp.your-name.workers.dev`).*

---

## 📝 Phase 6: Connect to Claude.ai

1. **Register your account:**
   Visit `https://your-worker-url.dev/auth/register` in your browser.
2. **Login with Google:**
   Follow the prompts. Once finished, the page will display a **Passphrase** (six random words).
   **🚨 COPY THIS NOW. It will never be shown again.**
3. **Configure Claude Desktop:**
   Open your Claude Desktop configuration file (usually `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

   ```json
   {
     "mcpServers": {
       "google-docs": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/inspector",
           "https://your-worker-url.dev/mcp/sse?passphrase=your-six-word-passphrase"
         ]
       }
     }
   }
   ```
4. **Restart Claude Desktop.**

---

## 🛠️ Troubleshooting

- **"Invalid Passphrase"**: Ensure you have no trailing spaces in your passphrase in the config file.
- **"Google hasn't verified this app"**: This is normal for private apps. Click "Advanced" -> "Go to [App Name] (unsafe)".
- **404 Not Found**: Ensure you are using the `/mcp/sse` path in your Claude configuration.
