# mercury-agent

Mercury operations agent for Slack, powered by Anthropic Claude tool use.

## Current capabilities

- Send money through Mercury by resolving a creator from PostgreSQL and using that creator's `mercury_recipient_id`
- List all Mercury recipients
- Get a specific Mercury recipient by recipient ID
- Get Mercury organization information

## Example Slack prompts

- `@mercury-agent Send $140 to Noha`
- `@mercury-agent List out all recipients`
- `@mercury-agent Get recipient rec_123...`
- `@mercury-agent Show organization details`

## Stack

- Hono HTTP server
- Node 20+ or Bun runtime
- Anthropic Claude (`@anthropic-ai/sdk`) for intent + tool selection
- Slack Bolt SDK
- Mercury API via native `fetch`
- PostgreSQL via `pg`
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

`createTransaction` uses `paymentMethod: "ach"` and generates an idempotency key per request.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Fill in required keys in `.env`:

- `MERCURY_API_KEY`
- `MERCURY_ACCOUNT_ID`
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- Optional: `ANTHROPIC_MODEL` (default: `claude-opus-4-5`)
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`

## PostgreSQL requirements

- The agent queries `public.creators`
- It matches creator identifiers against:
  - `first_name`, `last_name`, `tiktok_display_name`, `tiktok_username`, `email`, and full name (`first_name + last_name`)
- The table must include `mercury_recipient_id`

## Run

```bash
pnpm dev:slack
```

## Typecheck

```bash
pnpm typecheck
```
