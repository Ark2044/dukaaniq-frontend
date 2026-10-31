import type { ApiEnvelope, ApiErrorBody } from "@/types/api";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorBody["details"];
  readonly correlationId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? [];
    this.correlationId = body.correlationId;
  }
}

const NETWORK_ERROR: ApiErrorBody = {
  code: "NETWORK_ERROR",
  message: "Cannot reach the server. Check your connection and try again.",
  details: [],
};

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Calls the DukaanIQ API and unwraps the standard envelope, throwing ApiClientError on failure. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, headers = {} } = options;
  // FormData must reach fetch untouched so the browser sets the multipart boundary itself.
  const formData = typeof FormData !== "undefined" && body instanceof FormData ? body : null;

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      signal,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !formData ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError(0, NETWORK_ERROR);
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (envelope && envelope.success) return envelope.data;

  if (envelope && !envelope.success) throw new ApiClientError(response.status, envelope.error);

  throw new ApiClientError(response.status, {
    code: "UNEXPECTED_RESPONSE",
    message: "The server returned an unexpected response.",
    details: [],
  });
}
