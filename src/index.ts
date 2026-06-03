interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Jina AI Reader/Search MCP — turn any URL into clean LLM-ready markdown, plus web search.
 *
 * Tools:
 * - read_url: fetch a web page as clean markdown (r.jina.ai)
 * - search: web search returning top results as markdown (s.jina.ai)
 *
 * HYBRID auth: works KEYLESS by default. An optional `_apiKey` (your own Jina
 * key) raises rate limits and is required for higher-volume search usage.
 */


const READER_BASE = 'https://r.jina.ai/';
const SEARCH_BASE = 'https://s.jina.ai/';

const API_KEY_SCHEMA = {
  type: 'string',
  description: 'Optional — your own Jina API key for higher rate limits; works without one.',
} as const;

const tools: McpToolExport['tools'] = [
  {
    name: 'read_url',
    description:
      'Fetch any web page as clean, LLM-ready markdown (strips nav/ads) — ideal for giving an agent the readable content of a URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full target URL to fetch, e.g. "https://example.com/article".',
        },
        _apiKey: API_KEY_SCHEMA,
      },
      required: ['url'],
    },
  },
  {
    name: 'search',
    description:
      'Web search returning the top results as markdown. Higher-volume usage may require your own Jina API key (pass via _apiKey).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query, e.g. "best coffee in Seattle".',
        },
        _apiKey: API_KEY_SCHEMA,
      },
      required: ['query'],
    },
  },
];

function buildHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'text/plain' };
  if (typeof apiKey === 'string' && apiKey.length > 0) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string | undefined;
  delete args._apiKey;

  const headers = buildHeaders(apiKey);

  switch (name) {
    case 'read_url': {
      const url = args.url as string | undefined;
      if (typeof url !== 'string' || !url.trim()) {
        throw new Error('read_url requires a "url" argument, e.g. "https://example.com/article".');
      }
      // Jina expects the full target URL concatenated directly:
      // https://r.jina.ai/https://example.com/page (do NOT encode the whole thing).
      const res = await fetch(`${READER_BASE}${url}`, { headers });
      if (!res.ok) {
        return { error: res.status, message: await res.text() };
      }
      const text = await res.text();
      return {
        url,
        markdown: text.slice(0, 100000),
        truncated: text.length > 100000,
      };
    }
    case 'search': {
      const query = args.query as string | undefined;
      if (typeof query !== 'string' || !query.trim()) {
        throw new Error('search requires a "query" argument, e.g. "best coffee in Seattle".');
      }
      const res = await fetch(`${SEARCH_BASE}${encodeURIComponent(query)}`, { headers });
      if (!res.ok) {
        return { error: res.status, message: await res.text() };
      }
      const text = await res.text();
      return {
        query,
        results_markdown: text.slice(0, 50000),
        truncated: text.length > 50000,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
