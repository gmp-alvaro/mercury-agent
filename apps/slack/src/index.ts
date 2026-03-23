import { serve } from "@hono/node-server"
import { App } from "@slack/bolt"
import { Hono } from "hono"
import { registerMentionHandler } from "./handlers/mention.js"
import { createSlackReceiver } from "./receiver.js"

const receiver = createSlackReceiver()

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
})

registerMentionHandler(slackApp)

const app = new Hono()

app.get("/health", (c) => c.json({ ok: true }))

app.use("/slack/*", async (c) => {
  // Bridge Hono route handling to Slack's Express receiver.
  await new Promise<void>((resolve, reject) => {
    receiver.app(c.env.incoming, c.env.outgoing, (err?: unknown) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })

  return c.body(null)
})

const port = Number(process.env.PORT ?? 3000)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Slack app listening on http://localhost:${info.port}`)
  },
)
