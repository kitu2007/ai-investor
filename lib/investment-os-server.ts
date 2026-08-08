import "server-only";

const API_URL = (process.env.INVESTMENT_OS_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export class InvestmentOsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function investmentOsRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // Keep the HTTP status text when the backend did not return JSON.
    }
    throw new InvestmentOsApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export function publicError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof InvestmentOsApiError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { message: "The Investment OS backend timed out.", status: 504 };
  }
  return {
    message: "Cannot reach the Investment OS backend. Make sure it is running on port 8000.",
    status: 503,
  };
}
