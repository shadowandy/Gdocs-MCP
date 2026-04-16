/**
 * MCP Server Implementation with SSE Transport
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { log, Errors } from '../utils/errors';
import { ToolDefinitions } from './tools';
import { getTokens, refreshIfNeeded } from '../auth/tokens';
import { hashPassphrase } from '../auth/passphrase';
import {
  checkRateLimit,
  checkLockout,
  recordFailedAttempt,
  resetFailedAttempts,
} from '../security/rate-limiter';
import { readDoc } from '../google/docs-read';
import { writeDoc } from '../google/docs-write';
import { updateSection } from '../google/docs-section';
import { Env } from '../index';

// Map to associate transports with passphrases
// Using WeakMap to prevent memory leaks when transports are destroyed
const transportPassphrases = new WeakMap<any, string>();

export function createMcpServer(env: Env) {
  const server = new McpServer(
    {
      name: 'gdocs-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // 1. google_docs_read
  server.tool(
    'google_docs_read',
    ToolDefinitions.google_docs_read.inputSchema.properties as any,
    (async ({ url }: { url: string }, extra: any) => {
      const transport = (extra as any).transport;
      const passphrase = transportPassphrases.get(transport);
      if (!passphrase) throw Errors.Unauthorized('Missing authentication');

      const tokens = await getAuthenticatedTokens(env, passphrase);
      const markdown = await readDoc(url, tokens);
      return {
        content: [{ type: 'text', text: markdown }],
      };
    }) as any,
  );

  // 2. google_docs_write
  server.tool(
    'google_docs_write',
    ToolDefinitions.google_docs_write.inputSchema.properties as any,
    (async ({ url, markdown }: { url: string; markdown: string }, extra: any) => {
      const transport = (extra as any).transport;
      const passphrase = transportPassphrases.get(transport);
      if (!passphrase) throw Errors.Unauthorized('Missing authentication');

      const tokens = await getAuthenticatedTokens(env, passphrase);
      await writeDoc(url, markdown, tokens);
      return {
        content: [{ type: 'text', text: 'Document successfully updated.' }],
      };
    }) as any,
  );

  // 3. google_docs_update_section
  server.tool(
    'google_docs_update_section',
    ToolDefinitions.google_docs_update_section.inputSchema.properties as any,
    (async (
      { url, heading, markdown }: { url: string; heading: string; markdown: string },
      extra: any,
    ) => {
      const transport = (extra as any).transport;
      const passphrase = transportPassphrases.get(transport);
      if (!passphrase) throw Errors.Unauthorized('Missing authentication');

      const tokens = await getAuthenticatedTokens(env, passphrase);
      await updateSection(url, heading, markdown, tokens);
      return {
        content: [{ type: 'text', text: `Section "${heading}" successfully updated.` }],
      };
    }) as any,
  );

  return server;
}

async function getAuthenticatedTokens(env: Env, passphrase: string) {
  const passphraseHash = await hashPassphrase(passphrase);

  if (await checkLockout(env.GDOCS_RATELIMIT as any, passphraseHash)) {
    throw Errors.Forbidden('Account is locked');
  }

  await checkRateLimit(env.GDOCS_RATELIMIT as any, passphraseHash);

  const tokens = await getTokens(env, passphraseHash);
  if (!tokens) {
    await recordFailedAttempt(env.GDOCS_RATELIMIT as any, passphraseHash);
    throw Errors.Unauthorized('Invalid passphrase');
  }

  await resetFailedAttempts(env.GDOCS_RATELIMIT as any, passphraseHash);
  return await refreshIfNeeded(env, passphraseHash, tokens);
}

export async function handleMcpSseRequest(
  request: Request,
  env: Env,
  server: McpServer,
  passphrase?: string,
): Promise<Response> {
  const url = new URL(request.url);
  const finalPassphrase = passphrase || url.searchParams.get('passphrase');

  if (!finalPassphrase) {
    return new Response('Missing passphrase', { status: 401 });
  }

  // Use WebStandardStreamableHTTPServerTransport which is natively compatible with Fetch API (Workers)
  // We use the passphrase as the session identifier to maintain isolation
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => finalPassphrase,
  });

  transportPassphrases.set(transport, finalPassphrase);

  try {
    await server.connect(transport);
    // WebStandardStreamableHTTPServerTransport.handleRequest handles GET, POST, DELETE automatically
    return await transport.handleRequest(request);
  } catch (err: any) {
    console.error('MCP transport handleRequest error:', err);
    log('error', 'MCP transport handleRequest error', {
      error: err.message,
      stack: err.stack,
      url: request.url,
      method: request.method,
    });
    return new Response(`Transport Error: ${err.message}\nStack: ${err.stack}`, { status: 500 });
  }
}
