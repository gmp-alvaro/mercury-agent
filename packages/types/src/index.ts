export interface MercuryTransaction {
  id: string;
  status?: string;
  amount: number;
  note?: string;
  recipientId: string;
  accountId?: string;
}

export interface CreateTransactionInput {
  amount: number;
  recipientId: string;
  accountId: string;
  note?: string;
  paymentMethod?: "ach" | "check" | "domesticWire";
}

export interface MercuryAccount {
  id: string;
  accountNumber: string;
  availableBalance: number;
  canReceiveTransactions?: boolean | null;
  createdAt: string;
  currentBalance: number;
  dashboardLink: string;
  kind: string;
  legalBusinessName: string;
  name: string;
  nickname?: string | null;
  routingNumber: string;
  status: "active" | "deleted" | "pending" | "archived";
  type: "mercury" | "external" | "recipient";
}

export interface MercuryRecipient {
  id: string;
  name?: string;
  nickname?: string;
  email?: string;
}

export interface MercuryOrganization {
  id?: string;
  name?: string;
  legalName?: string;
  [key: string]: unknown;
}
