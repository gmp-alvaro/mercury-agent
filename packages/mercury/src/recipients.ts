import type { MercuryClient } from "./client.js"

export async function getRecipient(client: MercuryClient, recipientId: string) {
  return client.getRecipient(recipientId)
}

export async function listRecipients(client: MercuryClient) {
  return client.listRecipients()
}
