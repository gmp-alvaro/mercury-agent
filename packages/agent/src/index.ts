import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { mercury } from "@mercury-agent/mercury";
import { SYSTEM_PROMPT } from "./prompts.js";
import { tools } from "./tools.js";
import { findCreatorByName } from "./db.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MERCURY_ACCOUNT_ID = process.env.MERCURY_ACCOUNT_ID?.trim();

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  recipientId: z.string().min(1),
  note: z.string().optional(),
});

const getRecipientSchema = z.object({
  recipientId: z.string().min(1),
});

export async function runAgent(userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5",
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

      const resolvedInput = await resolveTransactionInput(parsed.data);
      if ("error" in resolvedInput) {
        return resolvedInput.error;
      }

      const tx = await mercury.createTransaction(resolvedInput);
      return formatTransactionResult(parsed.data.amount, tx);
    }

    case "getRecipients": {
      const recipientsResponse = await mercury.getRecipients();
      const recipients = recipientsResponse.recipients ?? [];

      if (recipients.length === 0) {
        return "I couldn't find any recipients in Mercury.";
      }

      const lines = recipients
        .slice(0, 20)
        .map((recipient, index) => formatRecipientLine(recipient, index + 1));

      const suffix =
        recipients.length > 20
          ? `\n...and ${recipients.length - 20} more recipients.`
          : "";

      return `Recipients (${recipients.length}):\n${lines.join("\n")}${suffix}`;
    }

    case "getRecipient": {
      const parsed = getRecipientSchema.safeParse(input);
      if (!parsed.success) {
        return "I need a valid recipient ID.";
      }

      const recipient = await mercury.getRecipient(parsed.data.recipientId);
      return formatRecipientDetail(recipient);
    }

    case "getOrganization": {
      const organization = await mercury.getOrganization();
      return formatOrganizationDetail(organization);
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

async function resolveTransactionInput(input: {
  amount: number;
  recipientId: string;
  note?: string;
}): Promise<
  | {
      amount: number;
      accountId: string;
      recipientId: string;
      note?: string;
    }
  | { error: string }
> {
  if (!MERCURY_ACCOUNT_ID) {
    return {
      error:
        "Missing MERCURY_ACCOUNT_ID. Set your company Mercury account ID in environment variables.",
    };
  }

  const recipientRef = input.recipientId.trim();
  let recipientId = recipientRef;

  const lookup = await findCreatorByName(recipientRef);
  if (lookup.status === "ambiguous") {
    return {
      error: `I found multiple creators matching "${recipientRef}" (${lookup.matches.join(", ")}). Please be more specific.`,
    };
  }

  if (lookup.status === "missing_recipient_column") {
    return {
      error:
        'Your creators table is missing "mercury_recipient_id". Add that column to store Mercury recipient IDs.',
    };
  }

  if (lookup.status === "missing_creators_table") {
    return {
      error: 'Could not find table "public.creators" in your database.',
    };
  }

  if (lookup.status === "missing_db_config") {
    return {
      error:
        "Missing DATABASE_URL. Set it so I can resolve creator names from PostgreSQL.",
    };
  }

  if (lookup.status === "not_found") {
    return {
      error: `I couldn't find creator "${recipientRef}" in the database.`,
    };
  }

  recipientId = lookup.mercuryRecipientId ?? "";
  if (!recipientId) {
    return {
      error: `I found ${lookup.label}, but mercury_recipient_id is not set yet.`,
    };
  }

  return {
    amount: input.amount,
    accountId: MERCURY_ACCOUNT_ID,
    recipientId,
    note: input.note,
  };
}

function formatTransactionResult(
  requestedAmount: number,
  tx: { id: string; status?: string; amount?: number },
): string {
  const amount = typeof tx.amount === "number" ? tx.amount : requestedAmount;
  const status = tx.status ? `\nStatus: ${tx.status}` : "";
  return `✅ Transaction created\nAmount: $${amount}\nTransaction ID: ${tx.id}${status}`;
}

function formatRecipientLine(
  recipient: { id: string; name?: string; nickname?: string; email?: string },
  index: number,
): string {
  const label =
    recipient.name ??
    recipient.nickname ??
    recipient.email ??
    "Unnamed recipient";
  const email = recipient.email ? ` - ${recipient.email}` : "";
  return `${index}. ${label}${email} (${recipient.id})`;
}

function formatRecipientDetail(recipient: {
  id: string;
  name?: string;
  nickname?: string;
  email?: string;
}): string {
  const label =
    recipient.name ??
    recipient.nickname ??
    recipient.email ??
    "Unnamed recipient";
  const nickname = recipient.nickname
    ? `\nNickname: ${recipient.nickname}`
    : "";
  const email = recipient.email ? `\nEmail: ${recipient.email}` : "";
  return `Recipient: ${label}\nID: ${recipient.id}${nickname}${email}`;
}

function formatOrganizationDetail(
  organizationResponse: Record<string, unknown>,
): string {
  const org =
    organizationResponse.organization &&
    typeof organizationResponse.organization === "object"
      ? (organizationResponse.organization as Record<string, unknown>)
      : organizationResponse;

  const legalBusinessName =
    typeof org.legalBusinessName === "string" ? org.legalBusinessName : null;
  const kind = typeof org.kind === "string" ? org.kind : null;
  const ein = typeof org.ein === "string" ? org.ein : null;
  const id = typeof org.id === "string" ? org.id : null;

  const lines = [
    "Organization details",
    `Name: ${legalBusinessName ?? "Unknown"}`,
    `Type: ${kind ?? "Unknown"}`,
    `EIN: ${ein ?? "Unknown"}`,
    `Organization ID: ${id ?? "Unknown"}`,
  ];

  return lines.join("\n");
}
