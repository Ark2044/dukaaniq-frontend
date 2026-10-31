export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  correlationId?: string;
}

export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorBody };

export interface SystemInfo {
  name: string;
  version: string;
  environment: string;
  payments: { provider: "MOCK" | "PAYTM_SANDBOX" | "PAYTM_PRODUCTION"; simulated: boolean };
  ai: { sarvamConfigured: boolean };
}
