export type PaymentChannelType =
  | "E_WALLET"
  | "BANK_TRANSFER"
  | "INSTAPAY"
  | "PESONET"
  | "PHYSICAL_RECEIPT"
  | "CREDIT_CARD"
  | "OTHER";

export type ReceiptStatus = "SUCCESS" | "COMPLETED" | "PENDING" | "FAILED" | "UNKNOWN";

export interface ReceiptOcrItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

export interface ReceiptOcrResult {
  success: boolean;
  channel: string; // e.g. "GCash", "Maya", "BPI", "BDO", "UnionBank", "InstaPay", "ShopeePay"
  channelType: PaymentChannelType;
  referenceNumber: string;
  amount: number;
  currency: string;
  senderName?: string;
  senderAccount?: string;
  receiverName?: string;
  receiverAccount?: string;
  transactionDateTime?: string;
  status: ReceiptStatus;
  confidenceScore: number; // 0 - 100
  rawText?: string;
  items?: ReceiptOcrItem[];
  notes: string[];
  isAmountMatched?: boolean;
  isReceiverMatched?: boolean;
  expectedAmount?: number;
  expectedReceiver?: string;
  aiModelUsed: string;
  analyzedAt: string;
  executionTimeMs?: number;
}

export interface AnalyzeReceiptRequest {
  imageBase64: string;
  mimeType?: string;
  expectedAmount?: number;
  expectedReceiver?: string;
}

export interface AnalyzeReceiptResponse {
  success: boolean;
  result: ReceiptOcrResult;
  error?: string;
  warning?: string;
}
