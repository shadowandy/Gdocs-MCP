# Quickstart: Passphrase in URL Path

## Updating your connection

Once the server is updated, you must change your connection URL in your MCP client.

### Claude Web (Claude.ai)

Update your server URL to the following format:
`https://your-worker.dev/mcp/word1-word2-word3-word4-word5-word6/sse`

### Claude Desktop

Update your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/inspector",
        "https://your-worker.dev/mcp/word1-word2-word3-word4-word5-word6/sse"
      ]
    }
  }
}
```

**Note**: Replace `word1...word6` with your actual 6-word passphrase.
