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

const getAccountSchema = z.object({
  accountId: z.string().min(1).optional(),
});

function formatLabeledValue(label: string, value: string): string {
  return `**${label}:** ${value}`;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

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

  if (!isToolAppropriateForMessage(userMessage, toolUse.name)) {
    return "I don't have access to that operation yet with the current Mercury endpoints. I can currently send money, list recipients, fetch a recipient by ID, show organization details, and fetch account balances.";
  }

  return dispatchTool(
    toolUse.name,
    toolUse.input as Record<string, unknown>,
    userMessage,
  );
}

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  userMessage: string,
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
      return formatTransactionResult(parsed.data.amount, tx, userMessage);
    }

    case "getRecipients": {
      const recipientsResponse = await mercury.getRecipients();
      const recipients = recipientsResponse.recipients ?? [];

      if (recipients.length === 0) {
        return "I couldn't find any recipients in Mercury.";
      }

      const lines = recipients
        .slice(0, 20)
        .map((recipient, index) =>
          formatRecipientLine(recipient, index + 1, userMessage),
        );

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
      return formatRecipientDetail(recipient, userMessage);
    }

    case "getOrganization": {
      const organization = await mercury.getOrganization();
      return formatOrganizationDetail(organization, userMessage);
    }

    case "getAccount": {
      const parsed = getAccountSchema.safeParse(input);
      if (!parsed.success) {
        return "I need a valid Mercury account ID.";
      }

      const accountId = parsed.data.accountId?.trim() || MERCURY_ACCOUNT_ID;
      if (!accountId) {
        return "Missing MERCURY_ACCOUNT_ID. Set your Mercury account ID in environment variables, or provide an account ID.";
      }

      const account = await mercury.getAccount(accountId);
      return formatAccountDetail(account, userMessage);
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
  userMessage: string,
): string {
  const amount = typeof tx.amount === "number" ? tx.amount : requestedAmount;
  const requestedField = getRequestedField(userMessage);

  if (requestedField === "transaction_id" || requestedField === "id") {
    return formatLabeledValue("Transaction ID", tx.id);
  }

  if (requestedField === "amount") {
    return formatLabeledValue("Amount", `$${amount}`);
  }

  if (requestedField === "status") {
    return tx.status
      ? formatLabeledValue("Status", tx.status)
      : "I couldn't find a status for this transaction.";
  }

  const status = tx.status ? `\n${formatLabeledValue("Status", tx.status)}` : "";
  return `✅ Transaction created\n${formatLabeledValue("Amount", `$${amount}`)}\n${formatLabeledValue("Transaction ID", tx.id)}${status}`;
}

function formatRecipientLine(
  recipient: { id: string; name?: string; nickname?: string; email?: string },
  index: number,
  userMessage: string,
): string {
  const requestedField = getRequestedField(userMessage);
  const label =
    recipient.name ??
    recipient.nickname ??
    recipient.email ??
    "Unnamed recipient";

  if (requestedField === "email") {
    return `${index}. ${recipient.email ?? "No email"} (${recipient.id})`;
  }

  if (requestedField === "name") {
    return `${index}. ${label}`;
  }

  if (requestedField === "nickname") {
    return `${index}. ${recipient.nickname ?? "No nickname"} (${recipient.id})`;
  }

  if (requestedField === "recipient_id" || requestedField === "id") {
    return `${index}. ${recipient.id}`;
  }

  const email = recipient.email ? ` - ${recipient.email}` : "";
  return `${index}. ${label}${email} (${recipient.id})`;
}

function formatRecipientDetail(
  recipient: {
    id: string;
    name?: string;
    nickname?: string;
    email?: string;
  },
  userMessage: string,
): string {
  const requestedField = getRequestedField(userMessage);
  const label =
    recipient.name ??
    recipient.nickname ??
    recipient.email ??
    "Unnamed recipient";

  if (requestedField === "email") {
    return recipient.email
      ? formatLabeledValue("Recipient email", recipient.email)
      : "I couldn't find an email for this recipient.";
  }

  if (requestedField === "name") {
    return formatLabeledValue("Recipient name", label);
  }

  if (requestedField === "nickname") {
    return recipient.nickname
      ? formatLabeledValue("Recipient nickname", recipient.nickname)
      : "I couldn't find a nickname for this recipient.";
  }

  if (requestedField === "recipient_id" || requestedField === "id") {
    return formatLabeledValue("Recipient ID", recipient.id);
  }

  const nickname = recipient.nickname
    ? `\n${formatLabeledValue("Nickname", recipient.nickname)}`
    : "";
  const email = recipient.email
    ? `\n${formatLabeledValue("Email", recipient.email)}`
    : "";
  return `${formatLabeledValue("Recipient", label)}\n${formatLabeledValue("ID", recipient.id)}${nickname}${email}`;
}

function formatOrganizationDetail(
  organizationResponse: Record<string, unknown>,
  userMessage: string,
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
  const message = userMessage.toLowerCase();

  if (message.includes("ein")) {
    return ein
      ? formatLabeledValue("EIN", ein)
      : "I couldn't find an EIN for this organization.";
  }

  if (message.includes("legal name") || message.includes("company name")) {
    return legalBusinessName
      ? `Your legal business name is ${legalBusinessName}.`
      : "I couldn't find a legal business name for this organization.";
  }

  if (message.includes("organization id") || message.includes("org id")) {
    return id
      ? formatLabeledValue("Organization ID", id)
      : "I couldn't find an organization ID.";
  }

  if (message.includes("type") || message.includes("kind")) {
    return kind
      ? `Your organization type is ${kind}.`
      : "I couldn't find an organization type.";
  }

  const lines = [
    "Organization details",
    formatLabeledValue("Name", legalBusinessName ?? "Unknown"),
    formatLabeledValue("Type", kind ?? "Unknown"),
    formatLabeledValue("EIN", ein ?? "Unknown"),
    formatLabeledValue("Organization ID", id ?? "Unknown"),
  ];

  return lines.join("\n");
}

function formatAccountDetail(
  account: {
    id: string;
    name?: string;
    status?: string;
    type?: string;
    accountNumber?: string;
    routingNumber?: string;
    availableBalance: number;
    currentBalance?: number;
  },
  userMessage: string,
): string {
  const requestedField = getRequestedField(userMessage);
  const availableBalance =
    typeof account.availableBalance === "number" ? account.availableBalance : null;
  const currentBalance =
    typeof account.currentBalance === "number" ? account.currentBalance : null;

  if (requestedField === "available_balance") {
    return availableBalance !== null
      ? formatLabeledValue("Available Balance", formatUsd(availableBalance))
      : "I couldn't find the available balance for this account.";
  }

  if (requestedField === "current_balance") {
    return currentBalance !== null
      ? formatLabeledValue("Current Balance", formatUsd(currentBalance))
      : "I couldn't find the current balance for this account.";
  }

  if (requestedField === "balance") {
    if (availableBalance !== null && currentBalance !== null) {
      return `${formatLabeledValue("Available Balance", formatUsd(availableBalance))}\n${formatLabeledValue("Current Balance", formatUsd(currentBalance))}`;
    }

    if (availableBalance !== null) {
      return formatLabeledValue("Available Balance", formatUsd(availableBalance));
    }

    if (currentBalance !== null) {
      return formatLabeledValue("Current Balance", formatUsd(currentBalance));
    }

    return "I couldn't find a balance for this account.";
  }

  if (requestedField === "account_id" || requestedField === "id") {
    return formatLabeledValue("Account ID", account.id);
  }

  if (requestedField === "account_number") {
    return account.accountNumber
      ? formatLabeledValue("Account Number", account.accountNumber)
      : "I couldn't find an account number for this account.";
  }

  if (requestedField === "routing_number") {
    return account.routingNumber
      ? formatLabeledValue("Routing Number", account.routingNumber)
      : "I couldn't find a routing number for this account.";
  }

  if (requestedField === "status") {
    return account.status
      ? formatLabeledValue("Status", account.status)
      : "I couldn't find a status for this account.";
  }

  if (requestedField === "type") {
    return account.type
      ? formatLabeledValue("Type", account.type)
      : "I couldn't find an account type.";
  }

  const lines = [
    "Account details",
    formatLabeledValue("Name", account.name ?? "Unknown"),
    formatLabeledValue(
      "Available Balance",
      availableBalance !== null ? formatUsd(availableBalance) : "Unknown",
    ),
    formatLabeledValue(
      "Current Balance",
      currentBalance !== null ? formatUsd(currentBalance) : "Unknown",
    ),
    formatLabeledValue("Status", account.status ?? "Unknown"),
    formatLabeledValue("Type", account.type ?? "Unknown"),
    formatLabeledValue("Account ID", account.id),
  ];

  return lines.join("\n");
}

type RequestedField =
  | "id"
  | "recipient_id"
  | "transaction_id"
  | "account_id"
  | "account_number"
  | "routing_number"
  | "name"
  | "email"
  | "nickname"
  | "amount"
  | "balance"
  | "available_balance"
  | "current_balance"
  | "status"
  | "ein"
  | "legal_name"
  | "organization_id"
  | "type"
  | null;

function getRequestedField(userMessage: string): RequestedField {
  const text = userMessage.toLowerCase();

  if (text.includes("transaction id")) return "transaction_id";
  if (text.includes("recipient id")) return "recipient_id";
  if (text.includes("account id")) return "account_id";
  if (text.includes("account number")) return "account_number";
  if (text.includes("routing number")) return "routing_number";
  if (text.includes("organization id") || text.includes("org id"))
    return "organization_id";
  if (text.includes("legal name") || text.includes("company name"))
    return "legal_name";
  if (text.includes("available balance")) return "available_balance";
  if (text.includes("current balance")) return "current_balance";
  if (text.includes("account balance") || text.includes(" balance"))
    return "balance";
  if (text.includes("nickname")) return "nickname";
  if (text.includes("email")) return "email";
  if (text.includes("name")) return "name";
  if (text.includes("ein")) return "ein";
  if (text.includes("status")) return "status";
  if (text.includes("amount")) return "amount";
  if (text.includes(" type") || text.endsWith("type") || text.includes("kind"))
    return "type";
  if (text.includes(" id")) return "id";
  return null;
}

function isToolAppropriateForMessage(
  userMessage: string,
  toolName: string,
): boolean {
  const text = userMessage.toLowerCase();

  const mentionsAny = (phrases: string[]) =>
    phrases.some((phrase) => text.includes(phrase));

  switch (toolName) {
    case "createTransaction":
      return mentionsAny(["send", "pay", "transfer", "payout", "wire", "$"]);
    case "getRecipients":
      return (
        mentionsAny(["recipient", "recipients", "payee", "payees"]) &&
        mentionsAny(["list", "show", "all", "get"])
      );
    case "getRecipient":
      return mentionsAny([
        "recipient id",
        "recipient ",
        "get recipient",
        "recipient details",
      ]);
    case "getOrganization":
      return mentionsAny([
        "organization",
        "organisation",
        "org",
        "company",
        "business",
        "ein",
        "legal name",
      ]);
    case "getAccount":
      return (
        mentionsAny([
          "balance",
          "account balance",
          "available balance",
          "current balance",
        ]) ||
        (mentionsAny(["account"]) &&
          mentionsAny(["details", "detail", "info", "information", "status"]))
      );
    default:
      return false;
  }
}
