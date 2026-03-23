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
  {
    name: "getRecipients",
    description: "List Mercury recipients",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "getRecipient",
    description: "Get details for a Mercury recipient by recipient ID",
    input_schema: {
      type: "object",
      properties: {
        recipientId: {
          type: "string",
          description: "Mercury recipient ID",
        },
      },
      required: ["recipientId"],
    },
  },
  {
    name: "getOrganization",
    description: "Get Mercury organization information",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];
