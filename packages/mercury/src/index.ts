import { MercuryClient } from "./client.js";
import { createTransaction } from "./transactions.js";

const client = new MercuryClient();

export const mercury = {
  createTransaction: (
    payload: Parameters<typeof client.createTransaction>[0],
  ) => createTransaction(client, payload),
  getRecipients: () => client.getRecipients(),
  getRecipient: (recipientId: string) => client.getRecipient(recipientId),
  getOrganization: () => client.getOrganization(),
  getAccount: (accountId: string) => client.getAccount(accountId),
};

export { MercuryClient } from "./client.js";
