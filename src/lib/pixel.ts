/**
 * Pixel — Meta (fbq) e TikTok (ttq)
 *
 * - Um evento Purchase = 1 conversão; `num_items` no Facebook = 1 (um pedido).
 * - `value` = valor total do pedido (soma dos itens + order bumps no checkout).
 * - TikTok: CompletePayment com contents no formato da documentação.
 * - Vários pixels TikTok: dispara em cada instância (ttq.instance(id).track).
 */

export type PixelEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Search";

export interface PixelContentLine {
  content_id: string;
  content_name?: string;
  quantity?: number;
  price?: number;
}

export interface PixelEventData {
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: PixelContentLine[];
  value?: number;
  currency?: string;
  num_items?: number;
  search_string?: string;
}

const TIKTOK_EVENT_MAP: Record<PixelEventName, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
  Search: "Search",
};

type UnknownRecord = Record<string, unknown>;

function getFbq(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === "undefined") return undefined;
  const fbq = (window as unknown as UnknownRecord).fbq;
  return typeof fbq === "function" ? (fbq as (...args: unknown[]) => void) : undefined;
}

function getTtq(): UnknownRecord | undefined {
  if (typeof window === "undefined") return undefined;
  const ttq = (window as unknown as UnknownRecord).ttq;
  return ttq && typeof ttq === "object" ? (ttq as UnknownRecord) : undefined;
}

/** Meta Pixel: contents com `id`, `item_price` (documentação Meta). */
function buildFacebookPayload(event: PixelEventName, data?: PixelEventData): UnknownRecord {
  if (!data) return {};
  const base: UnknownRecord = {
    currency: data.currency ?? "BRL",
  };
  if (data.value != null) base.value = data.value;
  if (data.content_type) base.content_type = data.content_type;
  if (data.content_ids?.length) base.content_ids = data.content_ids;
  if (data.search_string) base.search_string = data.search_string;
  if (data.content_name) base.content_name = data.content_name;

  if (data.contents?.length) {
    base.contents = data.contents.map((c) => ({
      id: String(c.content_id),
      quantity: Math.max(1, c.quantity ?? 1),
      item_price: c.price ?? 0,
    }));
  }

  // 1 pedido = 1 venda (independente de quantas unidades/linhas)
  if (event === "Purchase") {
    base.num_items = 1;
  } else if (data.num_items != null) {
    base.num_items = data.num_items;
  }

  return base;
}

/** TikTok: CompletePayment / InitiateCheckout — contents com content_id, price unitário. */
function buildTikTokPayload(event: PixelEventName, data?: PixelEventData): UnknownRecord {
  if (!data) return {};
  const out: UnknownRecord = {
    currency: data.currency ?? "BRL",
  };
  if (data.value != null) out.value = data.value;
  if (data.content_type) out.content_type = data.content_type;
  if (data.search_string) out.query = data.search_string;

  if (data.contents?.length) {
    out.contents = data.contents.map((c) => ({
      content_id: String(c.content_id),
      content_type: "product",
      content_name: c.content_name ?? "",
      quantity: Math.max(1, c.quantity ?? 1),
      price: c.price ?? 0,
    }));
  }

  return out;
}

/** Dispara track em cada pixel TikTok carregado (ttq.load). */
function trackTikTokAll(ttq: UnknownRecord, eventName: string, payload: UnknownRecord) {
  const ttqTrack = ttq.track;
  const ttqInstance = ttq.instance as ((id: string) => UnknownRecord) | undefined;
  const registry = ttq._i as Record<string, unknown> | undefined;

  if (registry && typeof ttqInstance === "function" && Object.keys(registry).length > 0) {
    for (const pixelId of Object.keys(registry)) {
      try {
        const inst = ttqInstance.call(ttq, pixelId);
        const track = inst?.track as ((ev: string, p: UnknownRecord) => void) | undefined;
        if (typeof track === "function") {
          track.call(inst, eventName, { ...payload });
        }
      } catch {
        /* ignore pixel id errors */
      }
    }
    return;
  }

  if (typeof ttqTrack === "function") {
    (ttqTrack as (ev: string, p: UnknownRecord) => void).call(ttq, eventName, payload);
  }
}

export function firePixelEvent(event: PixelEventName, data?: PixelEventData) {
  if (typeof window === "undefined") return;

  const fbq = getFbq();
  const ttq = getTtq();
  const fbPayload = buildFacebookPayload(event, data);
  const ttEvent = TIKTOK_EVENT_MAP[event];
  const ttPayload = buildTikTokPayload(event, data);

  if (fbq) {
    try {
      fbq("track", event, fbPayload);
    } catch (e) {
      console.warn("[pixel] fbq track error:", e);
    }
  }

  if (!ttq) return;

  try {
    if (event === "PageView") {
      const page = ttq.page as (() => void) | undefined;
      if (typeof page === "function") page.call(ttq);
      return;
    }
    trackTikTokAll(ttq, ttEvent, ttPayload);
  } catch (e) {
    console.warn("[pixel] ttq track error:", e);
  }
}
