export const tools = [
  {
    name: "createTransaction",
    description: "Send money to a recipient",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in USD" },
        recipientId: { type: "string", description: "Mercury recipient ID" },
        note: { type: "string", description: "Optional memo" },
      },
      required: ["amount", "recipientId"],
    },
  },
  {
    name: "getAccountBalance",
    description: "Get current balance of a Mercury account",
    input_schema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Mercury account ID" },
      },
      required: ["accountId"],
    },
  },
];
