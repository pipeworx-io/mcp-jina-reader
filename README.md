# @pipeworx/jina-reader

Turn any URL into clean, LLM-ready markdown, plus web search — via [Jina AI Reader](https://jina.ai/reader).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1865+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Tools

| Tool | What it answers |
|---|---|
| `read_url` | The readable content of a web page as markdown, with nav/ads/boilerplate stripped. |
| `search` | Top web-search results for a query, returned as markdown. |

## Auth

**A Jina API key is required.** Jina retired its anonymous tier — both
`r.jina.ai` and `s.jina.ai` now answer an unauthenticated request with
`401 AuthenticationRequiredError`. The pack shipped in June 2026 as keyless and
that is no longer true of the upstream.

- **Platform key:** `PLATFORM_JINA_KEY`, injected by the gateway as `_apiKey`.
  **Provisioned and live** since 2026-09-01 (`search` verified live against the
  deployed gateway that day, fleet #719) — callers need no key of their own.
  It is a FREE key on a fixed token grant, not a monthly reset, so the expected
  end state is the balance running out rather than the key expiring.
- **BYO:** pass `_apiKey` on the call. Free keys at <https://jina.ai/reader>.

Jina's 401 bodies are distinct and worth reading before assuming a key expired:

| Body | Means |
|---|---|
| `AuthenticationRequiredError: Authentication is required to use this endpoint` | no key was sent at all |
| `AuthenticationFailedError: Invalid API key` | the key sent is wrong or revoked |
| `AuthenticationRequiredError: … bad network reputation (ASnnnn)` | anonymous call from a blocked network |

A `402` is none of the above: the key is valid and its token balance is spent.
The pack says so in those words, and the gateway books it as
`platform_quota_exhausted` — a purchase, not a key to rotate and not a Jina
outage. Before 2026-09-01 that status fell through to `upstream_down`, which
would have read as the vendor being broken.

## Data sources

- Reader: <https://r.jina.ai/> — <https://jina.ai/reader>
- Search: <https://s.jina.ai/>

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "jina-reader": {
      "url": "https://gateway.pipeworx.io/jina-reader/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/jina-reader/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1865+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

Our jina-reader key is reserved for paid accounts, so an anonymous call to `POST https://gateway.pipeworx.io/v1/tools/read_url` needs your own key passed as `_apiKey` alongside the arguments. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/read_url`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-jina-reader` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/jina-reader/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "jina-reader": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-jina-reader"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Jina Reader data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
