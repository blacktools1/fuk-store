/**
 * Webhooks configuráveis pela loja (notificações HTTP para apps externos).
 */

export type StoreWebhookEvent = "sale_pending" | "sale_approved";

const MAX_URLS = 24;

/** Filtra e deduplica URLs http(s). */
export function sanitizeWebhookUrls(urls: string[] | undefined): string[] {
  const out: string[] = [];
  for (const u of urls ?? []) {
    const t = String(u).trim();
    if (!t) continue;
    try {
      const parsed = new URL(t);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      out.push(t);
    } catch {
      continue;
    }
  }
  return [...new Set(out)].slice(0, MAX_URLS);
}

export async function notifyStoreWebhooks(
  urls: string[] | undefined,
  event: StoreWebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const clean = sanitizeWebhookUrls(urls);
  if (clean.length === 0) return;

  const body = JSON.stringify({
    event,
    ...payload,
    sentAt: new Date().toISOString(),
  });

  await Promise.allSettled(
    clean.map((url) =>
      fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "EcomStore-Webhook/1.0",
          },
          body,
        },
        15_000
      ).catch((e) => {
        console.error(`[store-webhook] ${event} → ${url}:`, e);
      })
    )
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}
