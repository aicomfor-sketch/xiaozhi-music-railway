#!/usr/bin/env node
/**
 * xiaozhi-music-railway — Real music MCP SSE server
 *
 * Uses Meting (metowolf/Meting) to search and fetch playable URLs
 * from Netease, Tencent/QQ, Kugou, and Kuwo music platforms.
 *
 * Protocol: MCP JSON-RPC 2.0 over HTTP Server-Sent Events (SSE)
 * Designed for Railway.app deployment (env PORT)
 */
import http from 'http';
import Meting from './lib/meting/meting.js';

// ─── Config ────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8765', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ─── Meting client factory ──────────────────────────────────────
function createClient(platform) {
  const meting = new Meting(platform);
  meting.format(true);

  // Optional cookies from env
  const cookieVar = `METING_${platform.toUpperCase()}_COOKIE`;
  const cookie = process.env[cookieVar] || process.env.METING_COOKIE;
  if (cookie) {
    meting.cookie(cookie);
  }

  return meting;
}

// ─── Tool definitions ───────────────────────────────────────────
const PLATFORMS = ['netease', 'tencent', 'kugou', 'kuwo'];

const TOOLS = [
  {
    name: 'platforms',
    description: 'List supported music platforms (netease, tencent, kugou, kuwo).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return JSON.stringify({ ok: true, data: PLATFORMS.map(p => ({
        code: p,
        name: { netease: 'NetEase Cloud Music', tencent: 'Tencent QQ Music', kugou: 'KuGou Music', kuwo: 'Kuwo Music' }[p]
      }))}, null, 2);
    }
  },
  {
    name: 'search',
    description: 'Search songs, albums or artists on a specific music platform.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        keyword: { type: 'string', description: 'Search keyword (song/artist name)' },
        page: { type: 'integer', description: 'Page number', default: 1 },
        limit: { type: 'integer', description: 'Results per page', default: 20 }
      },
      required: ['platform', 'keyword']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const options = {};
      if (args.page) options.page = args.page;
      if (args.limit) options.limit = args.limit;
      const raw = await client.search(args.keyword, options);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'song',
    description: 'Get song details by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Song ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.song(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'url',
    description: 'Get playable audio URL for a song by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Song ID' },
        br: { type: 'integer', description: 'Bitrate (e.g. 128, 320)', default: 320 }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.url(args.id, args.br || 320);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'album',
    description: 'Get album details by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Album ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.album(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'artist',
    description: 'Get artist songs by artist ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Artist ID' },
        limit: { type: 'integer', description: 'Max results', default: 50 }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.artist(args.id, args.limit || 50);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'playlist',
    description: 'Get playlist details by playlist ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Playlist ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.playlist(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'lyric',
    description: 'Get song lyrics by song ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Song ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.lyric(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'pic',
    description: 'Get cover/picture URL by resource ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Picture/resource ID' },
        size: { type: 'integer', description: 'Image size in pixels', default: 300 }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.pic(args.id, args.size || 300);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  }
];

// ─── MCP JSON-RPC handler ───────────────────────────────────────
async function handleMessage(data) {
  const { id, method, params = {} } = data;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: true } },
            serverInfo: { name: 'xiaozhi-music-railway', version: '1.0.0' }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0', id,
          result: {
            tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
          }
        };

      case 'tools/call': {
        const tool = TOOLS.find(t => t.name === params.name);
        if (!tool) {
          return {
            jsonrpc: '2.0', id,
            error: { code: -32601, message: `Unknown tool: ${params.name}` }
          };
        }
        const text = await tool.handler(params.arguments || {});
        return {
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text }] }
        };
      }

      default:
        return {
          jsonrpc: '2.0', id,
          error: { code: -32601, message: `Unknown method: ${method}` }
        };
    }
  } catch (err) {
    console.error(`Error handling ${method}:`, err);
    return {
      jsonrpc: '2.0', id,
      error: { code: -32603, message: err.message || 'Internal error' }
    };
  }
}

// ─── HTTP Server with SSE support ───────────────────────────────
const server = http.createServer((req, res) => {
  const { method, url } = req;

  // Healthcheck endpoint
  if (method === 'GET' && url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // SSE endpoint for MCP
  if (method === 'POST' && url === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    let buffer = '';

    req.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);
          const response = await handleMessage(data);
          if (response) {
            res.write(`data: ${JSON.stringify(response)}\n\n`);
          }
        } catch (err) {
          console.error('SSE parse error:', err);
          res.write(`data: ${JSON.stringify({
            jsonrpc: '2.0', id: null,
            error: { code: -32700, message: 'Parse error' }
          })}\n\n`);
        }
      }
    });

    req.on('end', () => {
      res.end();
    });

    req.on('error', (err) => {
      console.error('SSE request error:', err);
      res.end();
    });

    return;
  }

  // Root endpoint
  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'xiaozhi-music-railway',
      version: '1.0.0',
      protocol: 'MCP 2024-11-05',
      transport: 'HTTP SSE',
      endpoints: {
        sse: '/sse (POST)',
        healthcheck: '/healthz (GET)'
      }
    }, null, 2));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`[ready] http://${HOST}:${PORT}  |  Music MCP Server (SSE)`);\n  console.log(`[ready] http://${HOST}:${PORT}/sse  |  MCP SSE endpoint`);\n  console.log(`[ready] http://${HOST}:${PORT}/healthz  |  Healthcheck endpoint`);\n  console.log(`[ready] Platforms: ${PLATFORMS.join(', ')}`);\n});\n\nserver.on('error', (err) => {\n  console.error('Server error:', err);\n  process.exit(1);\n});\n
