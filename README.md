# mercury-agent

Mercury operations agent for Slack, powered by AI tool use.

## Stack

- Hono HTTP server
- Node 20+ or Bun runtime
- Anthropic Claude for intent + tool selection
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
- `getRecipients`: [https://docs.mercury.com/reference/getrecipients](https://docs.mercury.com/reference/getrecipients)
- `getRecipient`: [https://docs.mercury.com/reference/getrecipient](https://docs.mercury.com/reference/getrecipient)
- `getOrganization`: [https://docs.mercury.com/reference/getorganization](https://docs.mercury.com/reference/getorganization)

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
- Set `MERCURY_ACCOUNT_ID` in `.env` (your own Mercury account ID)
- The API base URL is fixed in code to `https://api.mercury.com/api/v1`

### PostgreSQL recipient resolution

- Set `DATABASE_URL` so the agent can resolve creator names like "Noha" from your DB
- The agent runs a fixed SQL query against `public.creators` and matches on:
  - `first_name`, `last_name`, `tiktok_display_name`, `tiktok_username`, `email`, and full name (`first_name + last_name`)
- The `creators` table should include `mercury_recipient_id` (the agent uses this to execute transactions)

### AI provider configuration

- Set `ANTHROPIC_API_KEY`
- Optional: set `ANTHROPIC_MODEL` (default is `claude-opus-4-5`)

## Run

- Slack app:

```bash
pnpm dev:slack
```

## Typecheck

```bash
pnpm typecheck
```
