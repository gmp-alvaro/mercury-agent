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
}

export interface MercuryAccount {
  id: string;
  name?: string;
  availableBalance: number;
  currentBalance?: number;
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
