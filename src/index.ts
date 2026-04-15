/**
 * Cloudflare Worker Entry Point
 */

import { createMcpServer, handleMcpSseRequest } from './mcp/server';
import { Errors, log } from './utils/errors';
import { generateAuthUrl, exchangeCodeForTokens } from './auth/oauth';
import { generatePassphrase, hashPassphrase } from './auth/passphrase';
import { storeTokens, getTokens } from './auth/tokens';

export interface Env {
  GDOCS_TOKENS: KVNamespace;
  GDOCS_SESSIONS: KVNamespace;
  GDOCS_RATELIMIT: KVNamespace;
  ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  REDIRECT_URI: string;
}

const server = createMcpServer();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      // 1. MCP SSE Connection
      if (url.pathname === '/mcp/sse') {
        return await handleMcpSseRequest(request, env, server);
      }

      // 2. Auth Endpoints
      // GET /auth/register -> Redirect to Google
      if (url.pathname === '/auth/register' && request.method === 'GET') {
        const passphrase = generatePassphrase();
        const state = crypto.randomUUID();
        // Store state -> passphrase mapping for callback
        await env.GDOCS_SESSIONS.put(`state:${state}`, passphrase, { expirationTtl: 600 });
        
        const authUrl = await generateAuthUrl(env, state);
        return Response.redirect(authUrl);
      }

      // GET /auth/callback?code=...&state=...
      if (url.pathname === '/auth/callback' && request.method === 'GET') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code || !state) {
          throw Errors.BadRequest('Missing code or state');
        }

        const passphrase = await env.GDOCS_SESSIONS.get(`state:${state}`);
        if (!passphrase) {
          throw Errors.Unauthorized('Invalid or expired state');
        }

        const tokenData = await exchangeCodeForTokens(env, code);
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

        return new Response(`Authentication successful! Your passphrase is: ${passphrase}\n\nKeep this SECURE. It is the only way to access your account.`, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      // GET /auth/status/{passphrase}
      if (url.pathname.startsWith('/auth/status/') && request.method === 'GET') {
        const passphrase = url.pathname.replace('/auth/status/', '');
        const status = await env.GDOCS_SESSIONS.get(`status:${passphrase}`);
        
        if (!status) {
          return new Response(JSON.stringify({ status: 'NOT_FOUND' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ status }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 404
      return new Response('Not Found', { status: 404 });
    } catch (err: any) {
      log('error', 'Unhandled fetch error', { error: err.message, stack: err.stack });
      if (err.statusCode) {
        return new Response(JSON.stringify(err.toJSON()), {
          status: err.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
