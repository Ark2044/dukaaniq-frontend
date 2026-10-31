"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_ME_KEY, getMe, login as loginRequest, logout as logoutRequest, register as registerRequest } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import type { AuthSession, LoginPayload, RegisterPayload } from "@/types/auth";
import type { MerchantProfile } from "@/types/merchant";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  error: Error | null;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
  /** Replaces the cached merchant after a profile update. */
  setMerchant: (merchant: MerchantProfile) => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const isUnauthenticated = (error: unknown) => error instanceof ApiClientError && error.status === 401;

/**
 * Session state comes only from GET /auth/me (the session itself is an HttpOnly cookie that JavaScript
 * cannot read); nothing is persisted in localStorage or sessionStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const query = useQuery<AuthSession | null>({
    queryKey: AUTH_ME_KEY,
    queryFn: async ({ signal }) => {
      try {
        return await getMe(signal);
      } catch (error) {
        if (isUnauthenticated(error)) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });

  const login = useCallback(
    async (payload: LoginPayload) => {
      const session = await loginRequest(payload);
      queryClient.setQueryData(AUTH_ME_KEY, session);
      return session;
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const session = await registerRequest(payload);
      queryClient.setQueryData(AUTH_ME_KEY, session);
      return session;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      if (!isUnauthenticated(error)) throw error;
    }
    // Drop every cached merchant-scoped response so nothing leaks to the next user on this device.
    await queryClient.cancelQueries();
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== AUTH_ME_KEY[0] });
    queryClient.getMutationCache().clear();
    queryClient.setQueryData(AUTH_ME_KEY, null);
  }, [queryClient]);

  const setMerchant = useCallback(
    (merchant: MerchantProfile) => {
      queryClient.setQueryData<AuthSession | null>(AUTH_ME_KEY, (current) =>
        current ? { ...current, merchant } : current,
      );
    },
    [queryClient],
  );

  const retry = useCallback(() => {
    void query.refetch();
  }, [query]);

  const session = query.data ?? null;
  const status: AuthStatus = query.isError
    ? "error"
    : query.isPending
      ? "loading"
      : session
        ? "authenticated"
        : "unauthenticated";

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, error: query.error, login, register, logout, setMerchant, retry }),
    [status, session, query.error, login, register, logout, setMerchant, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** For components rendered behind the auth guard, where a session is guaranteed. */
export function useSession(): AuthSession {
  const { session } = useAuth();
  if (!session) throw new Error("useSession requires an authenticated session");
  return session;
}
