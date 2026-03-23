import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { mercury } from "@mercury-agent/mercury";
import { SYSTEM_PROMPT } from "./prompts.js";
import { tools } from "./tools.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  recipientId: z.string().min(1),
  note: z.string().optional(),
});

const getBalanceSchema = z.object({
  accountId: z.string().min(1),
});

export async function runAgent(userMessage: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: tools as any,
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    const text = response.content.find((block) => block.type === "text");
    return text?.text ?? "No response.";
  }

  return dispatchTool(toolUse.name, toolUse.input as Record<string, unknown>);
}

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "createTransaction": {
      const parsed = createTransactionSchema.safeParse(input);
      if (!parsed.success) {
        return "I need a valid amount and recipient to send money.";
      }

      const tx = await mercury.createTransaction(parsed.data);
      return `✅ Sent $${parsed.data.amount} — Transaction ID: ${tx.id}`;
    }

    case "getAccountBalance": {
      const parsed = getBalanceSchema.safeParse(input);
      if (!parsed.success) {
        return "I need a valid account ID to check balance.";
      }

      const account = await mercury.getAccount(parsed.data.accountId);
      return `💰 Balance: $${account.availableBalance}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
