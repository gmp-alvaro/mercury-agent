export const tools = [
  {
    name: "createTransaction",
    description: "Send money to a recipient",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in USD" },
        accountId: { type: "string", description: "Mercury account ID" },
        recipientId: { type: "string", description: "Mercury recipient ID" },
        note: { type: "string", description: "Optional memo" },
      },
      required: ["amount", "accountId", "recipientId"],
    },
  },
];

export const openAITools = tools.map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema,
  },
}));

export const geminiTools = [
  {
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    })),
  },
];
