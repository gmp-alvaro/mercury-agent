import type {
  CreateTransactionInput,
  MercuryAccount,
  MercuryRecipient,
  MercuryTransaction,
} from "@mercury-agent/types";

export interface MercuryClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class MercuryClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: MercuryClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.MERCURY_API_KEY ?? "";
    this.baseUrl =
      options.baseUrl ??
      process.env.MERCURY_API_BASE_URL ??
      "https://backend.mercury.com/api/v1";
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new Error("Missing MERCURY_API_KEY");
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
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
    return this.request<MercuryTransaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getAccount(accountId: string): Promise<MercuryAccount> {
    return this.request<MercuryAccount>(`/account/${accountId}`);
  }

  getRecipient(recipientId: string): Promise<MercuryRecipient> {
    return this.request<MercuryRecipient>(`/recipients/${recipientId}`);
  }

  listRecipients(): Promise<{ recipients: MercuryRecipient[] }> {
    return this.request<{ recipients: MercuryRecipient[] }>("/recipients");
  }
}
