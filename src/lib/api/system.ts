import { apiRequest } from "./client";
import type { SystemInfo } from "@/types/api";

export const getSystemInfo = (signal?: AbortSignal) =>
  apiRequest<SystemInfo>("/system/info", { signal });
