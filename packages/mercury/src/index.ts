import { MercuryClient } from "./client.js";
import { getAccount } from "./accounts.js";
import { getRecipient, listRecipients } from "./recipients.js";
import { createTransaction } from "./transactions.js";

const client = new MercuryClient();

export const mercury = {
  createTransaction: (
    payload: Parameters<typeof client.createTransaction>[0],
  ) => createTransaction(client, payload),
  getAccount: (accountId: string) => getAccount(client, accountId),
  getRecipient: (recipientId: string) => getRecipient(client, recipientId),
  listRecipients: () => listRecipients(client),
};

export { MercuryClient } from "./client.js";
