/**
 * Cloudflare Worker Entry Point
 */

import { createMcpServer, handleMcpSseRequest } from './mcp/server';
import { Errors, log } from './utils/errors';
import { generateAuthUrl, exchangeCodeForTokens } from './auth/oauth';
import { generatePassphrase, hashPassphrase } from './auth/passphrase';
import { storeTokens } from './auth/tokens';

export interface Env {
  GDOCS_TOKENS: KVNamespace;
  GDOCS_SESSIONS: KVNamespace;
  GDOCS_RATELIMIT: KVNamespace;
  ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  REDIRECT_URI: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, x-mcp-protocol-version, x-mcp-sdk-version, x-mcp-sdk-name',
      'Access-Control-Expose-Headers': 'Content-Type, Content-Length, Link, X-Mcp-Session-Id',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Private-Network': 'true',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate environment on startup
    const validateEnv = () => {
      const requiredKVs: (keyof Env)[] = ['GDOCS_TOKENS', 'GDOCS_SESSIONS', 'GDOCS_RATELIMIT'];
      const requiredVars: (keyof Env)[] = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'REDIRECT_URI',
        'ENCRYPTION_KEY',
      ];

      for (const kv of requiredKVs) {
        if (!env[kv]) throw new Error(`Missing KV binding: ${kv}`);
      }
      for (const v of requiredVars) {
        if (!env[v]) throw new Error(`Missing environment variable: ${v}`);
      }
    };

    try {
      validateEnv();

      let response: Response;

      // 1. MCP Routing (/mcp/{passphrase}/{sse|messages})
      const mcpMatch = url.pathname.match(/^\/mcp\/([^/]+)\/(sse|messages)/);
      if (mcpMatch) {
        const [, passphrase] = mcpMatch;
        const mcpServer = createMcpServer(env);
        response = await handleMcpSseRequest(request, env, mcpServer, passphrase);
      }
      // 1.1 Explicit rejection for legacy query-based path
      else if (url.pathname === '/mcp/sse' || url.pathname === '/mcp/messages') {
        throw Errors.Unauthorized(
          'Legacy query-based authentication is no longer supported. Please use the path-based URL format.',
        );
      }
      // 2. Auth Endpoints
      // GET /auth/register -> Redirect to Google
      else if (url.pathname === '/auth/register' && request.method === 'GET') {
        const passphrase = generatePassphrase();
        const state = crypto.randomUUID();
        // Store state -> passphrase mapping for callback
        await env.GDOCS_SESSIONS.put(`state:${state}`, passphrase, { expirationTtl: 600 });

        const authUrl = await generateAuthUrl(env, state);
        response = Response.redirect(authUrl);
      }
      // GET /auth/callback?code=...&state=...
      else if (url.pathname === '/auth/callback' && request.method === 'GET') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code || !state) {
          throw Errors.BadRequest('Missing code or state');
        }

        const passphrase = await env.GDOCS_SESSIONS.get(`state:${state}`);
        if (!passphrase) {
          throw Errors.Unauthorized('Invalid or expired state');
        }

        const tokenData = (await exchangeCodeForTokens(env, code)) as any;
        const passphraseHash = await hashPassphrase(passphrase);

        await storeTokens(env, passphraseHash, {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Date.now() + tokenData.expires_in * 1000,
        });

        // Clean up session
        await env.GDOCS_SESSIONS.delete(`state:${state}`);
        // Store the final status for the user to retrieve
        await env.GDOCS_SESSIONS.put(`status:${passphrase}`, 'COMPLETED', { expirationTtl: 3600 });

        response = new Response(
          `Authentication successful! Your passphrase is: ${passphrase}\n\nKeep this SECURE. It is the only way to access your account.`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          },
        );
      }
      // GET /auth/status/{passphrase}
      else if (url.pathname.startsWith('/auth/status/') && request.method === 'GET') {
        const passphrase = url.pathname.replace('/auth/status/', '');
        const status = await env.GDOCS_SESSIONS.get(`status:${passphrase}`);

        if (!status) {
          response = new Response(JSON.stringify({ status: 'NOT_FOUND' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          response = new Response(JSON.stringify({ status }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to the response
      // Cloudflare Workers Response objects can have their headers modified if they are newly created
      // Or we can create a new response with the augmented headers
      const finalHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        finalHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: finalHeaders,
      });
    } catch (err: any) {
      log('error', 'Unhandled fetch error', { error: err.message, stack: err.stack });
      const errorResponse = err.statusCode
        ? new Response(JSON.stringify(err.toJSON()), {
            status: err.statusCode,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(`Internal Server Error: ${err.message}`, { status: 500 });

      // Add CORS to error response too
      const finalHeaders = new Headers(errorResponse.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        finalHeaders.set(key, value);
      });

      return new Response(errorResponse.body, {
        status: errorResponse.status,
        statusText: errorResponse.statusText,
        headers: finalHeaders,
      });
    }
  },
};
