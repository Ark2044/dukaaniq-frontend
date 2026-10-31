import type { Unit } from "./product";

export type AiLanguage = "en-IN" | "hi-IN" | "mr-IN";
/** Speech input also accepts `unknown`, which lets the server detect the language. */
export type SpeechLanguage = AiLanguage | "unknown";

export interface AiStatus {
  configured: boolean;
  speech: boolean;
  chat: boolean;
  tts: boolean;
}

export type DraftStatus = "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";
export type DraftOptionWarning = "QUANTITY_MISSING" | "UNIT_MISMATCH" | "UNIT_ASSUMED" | "INSUFFICIENT_STOCK";
export type DraftWarning = "NO_SPEECH_DETECTED" | "NO_ITEMS_FOUND" | "SAME_PRODUCT_TWICE";
export type PaymentHint = "CASH" | "UPI" | "CREDIT";

/** A catalogue product offered for a spoken item. Prices and stock come from the shop's catalogue only. */
export interface DraftOption {
  productId: string;
  name: string;
  brand: string | null;
  unit: Unit;
  sellingPrice: number;
  stockQuantity: number;
  score: number;
  /** Spoken amount converted to this product's unit, or null when it could not be determined. */
  quantity: number | null;
  lineTotal: number | null;
  warnings: DraftOptionWarning[];
}

export interface DraftLine {
  spokenName: string;
  spokenQuantity: number | null;
  spokenUnit: string | null;
  status: DraftStatus;
  selected: DraftOption | null;
  options: DraftOption[];
  needsReview: boolean;
}

export interface DraftCustomerOption {
  customerId: string;
  name: string;
  score: number;
}

export interface DraftCustomer {
  spokenName: string;
  status: DraftStatus;
  selected: DraftCustomerOption | null;
  options: DraftCustomerOption[];
}

export interface VoiceDraft {
  interactionId: string;
  transcript: string;
  languageCode: string;
  extractedBy: "AI" | "RULES";
  lines: DraftLine[];
  customer: DraftCustomer | null;
  paymentHint: PaymentHint | null;
  estimatedTotal: number;
  requiresReview: boolean;
  warnings: DraftWarning[];
}

export interface ParseTextInput {
  interactionId: string;
  transcript: string;
}

export interface Transcription {
  interactionId: string;
  transcript: string;
  languageCode: string;
}

export type ChatIntent = "SALES" | "TOP_PRODUCTS" | "LOW_STOCK" | "OUTSTANDING" | "COLLECTIONS" | "PROFIT" | "UNSUPPORTED";
export type ReplySource = "AI" | "DATA";

export interface ChatFact {
  label: string;
  value: string;
}

export interface ChatReply {
  interactionId: string;
  answer: string;
  language: string;
  intent: ChatIntent;
  usedAi: boolean;
  source: ReplySource;
  facts: ChatFact[];
  notes: string[];
}

export interface ChatInput {
  message: string;
  language?: AiLanguage;
}

export interface SynthesizeInput {
  text: string;
  language?: AiLanguage;
}

export interface SynthesizedAudio {
  audioBase64: string;
  mimeType: string;
  language: string;
}
