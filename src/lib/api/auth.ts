import { apiRequest } from "./client";
import type { AuthSession, LoginPayload, RegisterPayload } from "@/types/auth";

export const AUTH_ME_KEY = ["auth", "me"] as const;

export const register = (payload: RegisterPayload) =>
  apiRequest<AuthSession>("/auth/register", { method: "POST", body: payload });

export const login = (payload: LoginPayload) =>
  apiRequest<AuthSession>("/auth/login", { method: "POST", body: payload });

export const logout = () => apiRequest<void>("/auth/logout", { method: "POST" });

export const getMe = (signal?: AbortSignal) => apiRequest<AuthSession>("/auth/me", { signal });
