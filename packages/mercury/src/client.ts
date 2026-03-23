import type {
  MercuryAccount,
  CreateTransactionInput,
  MercuryOrganization,
  MercuryRecipient,
  MercuryTransaction,
} from "@mercury-agent/types";
import { randomUUID } from "node:crypto";

export interface MercuryClientOptions {
  apiKey?: string;
}

export class MercuryClient {
  private static readonly BASE_URL = "https://api.mercury.com/api/v1";
  private readonly apiKey: string;

  constructor(options: MercuryClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.MERCURY_API_KEY ?? "";
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new Error("Missing MERCURY_API_KEY");
    }

    const res = await fetch(`${MercuryClient.BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    return (await res.json()) as T;
  }

  createTransaction(
    payload: CreateTransactionInput,
  ): Promise<MercuryTransaction> {
    const { accountId, ...body } = payload;
    return this.request<MercuryTransaction>(
      `/account/${accountId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          ...body,
          // Mercury requires these fields for SendMoney API requests.
          paymentMethod: payload.paymentMethod ?? "ach",
          idempotencyKey: randomUUID(),
        }),
      },
    );
  }

  getRecipients(): Promise<{ recipients: MercuryRecipient[] }> {
    return this.request<{ recipients: MercuryRecipient[] }>("/recipients");
  }

  getRecipient(recipientId: string): Promise<MercuryRecipient> {
    return this.request<MercuryRecipient>(`/recipient/${recipientId}`);
  }

  getOrganization(): Promise<MercuryOrganization> {
    return this.request<MercuryOrganization>("/organization");
  }

  getAccount(accountId: string): Promise<MercuryAccount> {
    return this.request<MercuryAccount>(`/account/${accountId}`);
  }
}
