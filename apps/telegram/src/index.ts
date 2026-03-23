import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Telegraf } from "telegraf";
import { handleTextMessage } from "./handlers/message.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const bot = new Telegraf(token);

bot.on("text", handleTextMessage);

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/telegram/webhook", async (c) => {
  await bot.handleUpdate(await c.req.json());
  return c.text("ok");
});

const port = Number(process.env.PORT ?? 3001);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Telegram app listening on http://localhost:${info.port}`);
  },
);
