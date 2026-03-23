# mercury-agent

Mercury operations agent for Slack and Telegram, powered by Claude tool use.

## Stack

- Hono HTTP server
- Node 20+ or Bun runtime
- Claude API (`@anthropic-ai/sdk`) for intent + tool selection
- Slack Bolt SDK
- Telegraf for Telegram
- Mercury API via native `fetch`
- Zod validation
- pnpm workspaces monorepo
- TypeScript

## Workspace layout

- `apps/slack`: Slack webhook + mention handler
- `apps/telegram`: Telegram webhook + message handler
- `packages/agent`: Claude orchestration + tool dispatching
- `packages/mercury`: Mercury API client
- `packages/types`: shared TypeScript interfaces

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

## Run

- Slack app:

```bash
pnpm dev:slack
```

- Telegram app:

```bash
pnpm dev:telegram
```

## Typecheck

```bash
pnpm typecheck
```
# mercury-agent
# mercury-agent
