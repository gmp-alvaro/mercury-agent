# mercury-agent

Mercury operations agent for Slack, powered by AI tool use.

## Stack

- Hono HTTP server
- Node 20+ or Bun runtime
- Anthropic Claude, OpenAI, or Gemini for intent + tool selection
- Slack Bolt SDK
- Mercury API via native `fetch`
- Zod validation
- pnpm workspaces monorepo
- TypeScript

## Workspace layout

- `apps/slack`: Slack webhook + mention handler
- `packages/agent`: Claude orchestration + tool dispatching
- `packages/mercury`: Mercury API client
- `packages/types`: shared TypeScript interfaces

## Mercury API reference

- `createTransaction`: [https://docs.mercury.com/reference/createtransaction](https://docs.mercury.com/reference/createtransaction)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Fill in required keys in `.env`.

### Mercury configuration

- Set `MERCURY_API_KEY` in `.env`
- The API base URL is fixed in code to `https://api.mercury.com/api/v1`

### AI provider configuration

- `AI_PROVIDER=anthropic|openai|gemini`
- For Anthropic: set `ANTHROPIC_API_KEY` (and optional `ANTHROPIC_MODEL`)
- For OpenAI: set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`)
- For Gemini: set `GEMINI_API_KEY` (and optional `GEMINI_MODEL`)

## Run

- Slack app:

```bash
pnpm dev:slack
```

## Typecheck

```bash
pnpm typecheck
```
