import type { App } from "@slack/bolt";
import { runAgent } from "@mercury-agent/agent";

function toSlackMrkdwn(text: string): string {
  // Slack uses *bold* syntax, not **bold**.
  return text.replace(/\*\*(.+?)\*\*/g, "*$1*");
}

export function registerMentionHandler(slackApp: App) {
  slackApp.event("app_mention", async ({ event, say }) => {
    const input = event.text.replace(/<@[^>]+>/g, "").trim();
    if (!input) {
      await say("Tell me what you want to do, like: Send $140 to Noha.");
      return;
    }

    const result = await runAgent(input);
    await say({
      text: toSlackMrkdwn(result),
      mrkdwn: true,
    });
  });
}
