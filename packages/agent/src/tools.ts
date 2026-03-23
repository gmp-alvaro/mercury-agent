export const tools = [
  {
    name: "createTransaction",
    description: "Send money to a recipient",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in USD" },
        recipientId: {
          type: "string",
          description:
            "Creator identifier (name, username, or email) resolvable from your creators table.",
        },
        note: { type: "string", description: "Optional memo" },
      },
      required: ["amount", "recipientId"],
    },
  },
];
