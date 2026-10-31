import type { ChatReply, DraftCustomer, DraftLine, DraftOption, VoiceDraft } from "@/types/ai";

export const draftOption = (overrides: Partial<DraftOption> = {}): DraftOption => ({
  productId: "p-sugar",
  name: "Sugar",
  brand: null,
  unit: "KG",
  sellingPrice: 45,
  stockQuantity: 48,
  score: 1,
  quantity: 2,
  lineTotal: 90,
  warnings: [],
  ...overrides,
});

/** A confidently matched line by default; pass `status`, `selected` and `options` to build other states. */
export const draftLine = (overrides: Partial<DraftLine> = {}): DraftLine => ({
  spokenName: "chini",
  spokenQuantity: 2,
  spokenUnit: "kg",
  status: "MATCHED",
  selected: draftOption(),
  options: [draftOption()],
  needsReview: false,
  ...overrides,
});

export const draftCustomer = (overrides: Partial<DraftCustomer> = {}): DraftCustomer => ({
  spokenName: "Ramesh",
  status: "MATCHED",
  selected: { customerId: "c-1", name: "Ramesh Kumar", score: 0.95 },
  options: [{ customerId: "c-1", name: "Ramesh Kumar", score: 0.95 }],
  ...overrides,
});

export const voiceDraft = (overrides: Partial<VoiceDraft> = {}): VoiceDraft => ({
  interactionId: "d-1",
  transcript: "2 kilo chini",
  languageCode: "hi-IN",
  extractedBy: "AI",
  lines: [draftLine()],
  customer: null,
  paymentHint: "CASH",
  estimatedTotal: 90,
  requiresReview: false,
  warnings: [],
  ...overrides,
});

export const chatReply = (overrides: Partial<ChatReply> = {}): ChatReply => ({
  interactionId: "r-1",
  answer: "Today's sales are ₹12,480 across 18 bills.",
  language: "en-IN",
  intent: "SALES",
  usedAi: true,
  source: "AI",
  facts: [{ label: "Sales amount (net of returns)", value: "₹12,480" }],
  notes: [],
  ...overrides,
});

export const aiStatusOk = { configured: true, speech: true, chat: true, tts: true };
export const aiStatusOff = { configured: false, speech: false, chat: false, tts: false };
