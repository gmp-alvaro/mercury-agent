import { ExpressReceiver } from "@slack/bolt";

export function createSlackReceiver() {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    throw new Error("Missing SLACK_SIGNING_SECRET");
  }

  return new ExpressReceiver({
    signingSecret,
    endpoints: "/slack/events",
  });
}
