import type { CreateTransactionInput } from "@mercury-agent/types"
import type { MercuryClient } from "./client.js"

export async function createTransaction(client: MercuryClient, payload: CreateTransactionInput) {
  return client.createTransaction(payload)
}
