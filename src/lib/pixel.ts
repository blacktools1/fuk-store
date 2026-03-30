/**
 * Pixel event helpers — works with multiple FB Pixel and TikTok Pixel instances.
 * Call these functions from client components; they are no-ops on the server.
 */

export type PixelEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Search";

export interface PixelEventData {
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
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

export function firePixelEvent(event: PixelEventName, data?: PixelEventData) {
  if (typeof window === "undefined") return;

  // Facebook Pixel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fbq = (window as any).fbq;
  if (typeof fbq === "function") {
    fbq("track", event, data ?? {});
  }

  // TikTok Pixel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ttq = (window as any).ttq;
  if (ttq && typeof ttq.track === "function") {
    const ttqEvent = TIKTOK_EVENT_MAP[event];
    if (event === "PageView") {
      ttq.page();
    } else {
      ttq.track(ttqEvent, data ?? {});
    }
  }
}
