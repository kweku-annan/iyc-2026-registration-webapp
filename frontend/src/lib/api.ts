/**
 * Lightweight API client. All fetch calls go through here so the base URL
 * is configured in one place via the VITE_API_URL environment variable.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ApiError = {
  detail: string;
  code?: string;
};

export class HttpError extends Error {
  readonly status: number;
  readonly body: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.detail);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
  },
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method,
    credentials: "include", // send auth cookies
    headers: {
      "Content-Type": "application/json",
      // Custom header required for CSRF protection on cookie-authenticated requests.
      "X-Requested-With": "XMLHttpRequest",
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorBody: ApiError = { detail: response.statusText };
    try {
      errorBody = await response.json();
    } catch {
      // non-JSON error body — use the status text fallback above
    }
    throw new HttpError(response.status, errorBody);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>("GET", path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
