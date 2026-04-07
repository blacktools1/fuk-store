"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { StorePixel } from "@/lib/admin-types";

export default function PixelScripts({ pixels }: { pixels: StorePixel[] }) {
  const pathname = usePathname();
  const active = pixels?.filter((p) => p.active) ?? [];
  const fbPixels = active.filter((p) => p.type === "facebook");
  const ttPixels = active.filter((p) => p.type === "tiktok");

  // Evita PageView duplo: o script inline já dispara o PageView inicial.
  // O useEffect só dispara nas navegações client-side subsequentes.
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fbq = (window as any).fbq;
    if (fbPixels.length && typeof fbq === "function") fbq("track", "PageView");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ttq = (window as any).ttq;
    if (ttPixels.length && ttq && typeof ttq.page === "function") ttq.page();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (active.length === 0) return null;

  const fbBaseCode = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
${fbPixels.map((p) => `fbq('init','${p.pixelId}');`).join("\n")}
fbq('track','PageView');
`.trim();

  const ttBaseCode = `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
${ttPixels.map((p) => `  ttq.load('${p.pixelId}');`).join("\n")}
  ttq.page();
}(window, document, 'ttq');
`.trim();

  return (
    <>
      {fbPixels.length > 0 && (
        <Script
          id="fb-pixel-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: fbBaseCode }}
        />
      )}
      {ttPixels.length > 0 && (
        <Script
          id="tiktok-pixel-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: ttBaseCode }}
        />
      )}
    </>
  );
}
