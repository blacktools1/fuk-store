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
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

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
