"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function StoreShell({
  header,
  footer,
  marquee,
  marqueeAbove,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  marquee: ReactNode;
  marqueeAbove: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin  = pathname.startsWith("/admin");
  const isMaster = pathname.startsWith("/master-admin") || pathname.startsWith("/master-home");
  const isCheckout = pathname === "/checkout" || pathname.startsWith("/checkout/");

  if (isAdmin || isMaster) return <>{children}</>;

  if (isCheckout) {
    return (
      <>
        <main>{children}</main>
        {footer}
      </>
    );
  }

  return (
    <>
      {marqueeAbove && marquee}
      {header}
      {!marqueeAbove && marquee}
      <main>{children}</main>
      {footer}
    </>
  );
}
