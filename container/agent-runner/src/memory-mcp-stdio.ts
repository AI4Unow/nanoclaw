import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const baseUrl = (process.env.MEMORY_API_URL || 'https://memory.ai4u.now').replace(/\/$/, '');
const apiKey = process.env.MEMORY_API_KEY || '';
const defaultNamespace = process.env.MEMORY_NAMESPACE || 'main';
const isAdmin = process.env.MEMORY_IS_ADMIN === '1';

function assertNamespace(value: string): string {
  const cleaned = value.trim();
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(cleaned)) {
    throw new Error('Namespace must match [a-zA-Z0-9._-] and be <= 64 chars');
  }
  return cleaned;
}

function resolveNamespace(namespace?: string): string {
  if (!namespace) {
    return assertNamespace(defaultNamespace);
  }
  if (!isAdmin) {
    return assertNamespace(defaultNamespace);
  }
  return assertNamespace(namespace);
}

async function postMemory(pathname: string, payload: Record<string, unknown>): Promise<unknown> {
  if (!apiKey) {
    throw new Error('MEMORY_API_KEY is not set. Configure it in .env and restart NanoClaw.');
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  let parsedBody: unknown = bodyText;
  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    // Keep raw text when JSON parsing fails.
  }

  if (!response.ok) {
    throw new Error(
      `Memory API ${pathname} failed (${response.status}): ${typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)}`,
    );
  }

  return parsedBody;
}

const server = new McpServer({
  name: 'memory',
  version: '1.0.0',
});

server.tool(
  'memory_store',
  'Store a memory fact for the current group namespace. Admin can override namespace explicitly.',
  {
    text: z.string().min(1).describe('Fact or memory text to store.'),
    namespace: z.string().optional().describe('Optional namespace override (admin only).'),
    source: z.string().optional().describe('Optional source label.'),
    metadata: z.record(z.string(), z.any()).optional().describe('Optional metadata object.'),
  },
  async (args) => {
    try {
      const namespace = resolveNamespace(args.namespace);
      const result = await postMemory('/v1/ingest', {
        text: args.text,
        namespace,
        source: args.source || 'nanoclaw-mcp',
        metadata: {
          ...(args.metadata || {}),
          namespace,
          is_admin_request: isAdmin,
        },
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `memory_store failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'memory_search',
  'Recall memories using semantic search. Scoped to current namespace unless admin overrides namespace.',
  {
    query: z.string().min(1).describe('Search query.'),
    limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results.'),
    namespace: z.string().optional().describe('Optional namespace override (admin only).'),
  },
  async (args) => {
    try {
      const namespace = resolveNamespace(args.namespace);
      const result = await postMemory('/v1/recall', {
        query: args.query,
        namespace,
        limit: args.limit ?? 10,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `memory_search failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'memory_get_entity',
  'Get details for a single entity from memory graph.',
  {
    entity: z.string().min(1).describe('Entity name to retrieve.'),
    namespace: z.string().optional().describe('Optional namespace override (admin only).'),
  },
  async (args) => {
    try {
      const namespace = resolveNamespace(args.namespace);
      const result = await postMemory('/v1/entities', {
        query: args.entity,
        namespace,
        limit: 1,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `memory_get_entity failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'memory_list_recent',
  'List recently captured memory episodes for the current namespace.',
  {
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of recent episodes.'),
    namespace: z.string().optional().describe('Optional namespace override (admin only).'),
  },
  async (args) => {
    try {
      const namespace = resolveNamespace(args.namespace);
      const result = await postMemory('/v1/episodes', {
        namespace,
        limit: args.limit ?? 20,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `memory_list_recent failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
