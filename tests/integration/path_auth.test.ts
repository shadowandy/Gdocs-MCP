import { describe, it, expect, vi } from 'vitest';
import { Env } from '../../src/index';
import worker from '../../src/index';

// Mock the MCP server and its handlers
vi.mock('../../src/mcp/server', () => ({
  createMcpServer: vi.fn(() => ({})),
  handleMcpSseRequest: vi.fn(async () => new Response('SSE Connected', { status: 200 })),
}));

describe('Integration - Path-based Authentication', () => {
  const env: Env = {
    GDOCS_TOKENS: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } as any,
    GDOCS_SESSIONS: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } as any,
    GDOCS_RATELIMIT: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } as any,
    ENCRYPTION_KEY: 'test_key',
    GOOGLE_CLIENT_ID: 'test_id',
    GOOGLE_CLIENT_SECRET: 'test_secret',
    REDIRECT_URI: 'test_uri',
  };

  const ctx = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as any;

  it('should accept connection with passphrase in path', async () => {
    const request = new Request('https://test.workers.dev/mcp/tiger-maple-7-cloud/sse');
    const response = await worker.fetch(request, env, ctx);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('SSE Connected');
  });

  it('should reject legacy query parameter connection', async () => {
    const request = new Request('https://test.workers.dev/mcp/sse?passphrase=tiger-maple-7-cloud');
    const response = await worker.fetch(request, env, ctx);

    // Legacy path should no longer match or should be explicitly rejected
    expect(response.status).toBe(401);
  });

  it('should reject connection with missing passphrase in path', async () => {
    const request = new Request('https://test.workers.dev/mcp//sse');
    const response = await worker.fetch(request, env, ctx);

    expect(response.status).toBe(404);
  });
});
