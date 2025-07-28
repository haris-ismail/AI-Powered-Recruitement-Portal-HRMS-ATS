import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCsrfToken } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add CSRF token for non-GET requests
  if (method !== 'GET' && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies
  });

  await throwIfResNotOk(res);
  return res;
}

export type UnauthorizedBehavior = "redirect" | "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {};
    
    // Add CSRF token for non-GET requests
    if (queryKey[0] !== 'GET' && csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include", // Include cookies
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
