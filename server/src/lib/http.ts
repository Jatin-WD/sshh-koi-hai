import { env } from "../config/env.js";

export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMs = env.OUTBOUND_HTTP_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const normalizedTimeout = Math.max(1, Math.floor(timeoutMs));
  const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${normalizedTimeout}ms`)), normalizedTimeout);

  const signal = init.signal;
  const onAbort = signal ? () => controller.abort(signal.reason) : undefined;
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      if (onAbort) signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
  }
}
