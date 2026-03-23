import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { mercury } from "@mercury-agent/mercury";
import { SYSTEM_PROMPT } from "./prompts.js";
import { geminiTools, openAITools, tools } from "./tools.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type AIProvider = "anthropic" | "openai" | "gemini";

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1),
  recipientId: z.string().min(1),
  note: z.string().optional(),
});

export async function runAgent(userMessage: string): Promise<string> {
  const provider = resolveProvider();

  switch (provider) {
    case "openai":
      return runWithOpenAI(userMessage);
    case "gemini":
      return runWithGemini(userMessage);
    default:
      return runWithAnthropic(userMessage);
  }
}

async function runWithAnthropic(userMessage: string): Promise<string> {
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

async function runWithOpenAI(userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    tools: openAITools as any,
    tool_choice: "auto",
  });

  const message = response.choices[0]?.message;
  const firstToolCall = message?.tool_calls?.[0] as any;
  if (firstToolCall?.function) {
    const input = safeJsonParse(firstToolCall.function.arguments);
    return dispatchTool(firstToolCall.function.name, input);
  }

  return message?.content ?? "No response.";
}

async function runWithGemini(userMessage: string): Promise<string> {
  const response = await gemini.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: geminiTools as any,
    },
  });

  const functionCall =
    (response as any).functionCalls?.[0] ??
    (response as any).candidates?.[0]?.content?.parts?.find(
      (part: any) => part.functionCall,
    )?.functionCall;

  if (functionCall?.name) {
    return dispatchTool(
      functionCall.name,
      (functionCall.args ?? {}) as Record<string, unknown>,
    );
  }

  const text = (response as any).text;
  return typeof text === "string" && text.length > 0 ? text : "No response.";
}

function resolveProvider(): AIProvider {
  const configured = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (
    configured === "anthropic" ||
    configured === "openai" ||
    configured === "gemini"
  ) {
    return configured;
  }

  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "anthropic";
}

function safeJsonParse(input: string | undefined): Record<string, unknown> {
  if (!input) return {};

  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "createTransaction": {
      const parsed = createTransactionSchema.safeParse(input);
      if (!parsed.success) {
        return "I need a valid amount, account ID, and recipient to send money.";
      }

      const tx = await mercury.createTransaction(parsed.data);
      return `✅ Sent $${parsed.data.amount} — Transaction ID: ${tx.id}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
