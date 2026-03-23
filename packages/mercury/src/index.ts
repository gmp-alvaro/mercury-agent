import { MercuryClient } from "./client.js";
import { createTransaction } from "./transactions.js";

const client = new MercuryClient();

export const mercury = {
  createTransaction: (
    payload: Parameters<typeof client.createTransaction>[0],
  ) => createTransaction(client, payload),
};

export { MercuryClient } from "./client.js";
