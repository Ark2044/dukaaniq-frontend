"use client";

import { useState, type ReactNode } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/common/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AUTH_ME_KEY } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const queryClient: QueryClient = new QueryClient({
      queryCache: new QueryCache({
        // A 401 on any data request means the session expired: drop to the logged-out state.
        onError: (error, query) => {
          if (error instanceof ApiClientError && error.status === 401 && query.queryKey[0] !== AUTH_ME_KEY[0]) {
            queryClient.setQueryData(AUTH_ME_KEY, null);
          }
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          // Client errors (4xx) will not succeed on retry; network/5xx may.
          retry: (count, error) =>
            count < 2 && !(error instanceof ApiClientError && error.status >= 400 && error.status < 500),
        },
      },
    });
    return queryClient;
  });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
