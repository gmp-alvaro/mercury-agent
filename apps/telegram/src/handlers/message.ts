import type { Context } from "telegraf";
import { runAgent } from "@mercury-agent/agent";

export async function handleTextMessage(ctx: Context) {
  const text =
    "message" in ctx.update && "text" in ctx.update.message
      ? ctx.update.message.text
      : undefined;
  if (!text?.trim()) {
    await ctx.reply("Send a message like: Send $140 to Noha.");
    return;
  }

  const result = await runAgent(text.trim());
  await ctx.reply(result);
}
