import type { MercuryClient } from "./client.js";

export async function getAccount(client: MercuryClient, accountId: string) {
  return client.getAccount(accountId);
}
