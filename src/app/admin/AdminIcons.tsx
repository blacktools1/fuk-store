/** Ícones stroke minimalistas para o painel admin (sem emojis). */
import type { ReactNode } from "react";

const stroke = "currentColor";

function Svg({
  children,
  size = 18,
  className,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export type AdminIconName =
  | "layout"
  | "palette"
  | "image"
  | "package"
  | "creditCard"
  | "receipt"
  | "activity"
  | "externalLink"
  | "logOut"
  | "truck"
  | "clock"
  | "sparkles"
  | "tracking";

export function AdminIcon({
  name,
  size = 18,
  className,
}: {
  name: AdminIconName;
  size?: number;
  className?: string;
}) {
  switch (name) {
    case "layout":
      return (
        <Svg size={size} className={className}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </Svg>
      );
    case "palette":
      return (
        <Svg size={size} className={className}>
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </Svg>
      );
    case "image":
      return (
        <Svg size={size} className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </Svg>
      );
    case "package":
      return (
        <Svg size={size} className={className}>
          <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </Svg>
      );
    case "creditCard":
      return (
        <Svg size={size} className={className}>
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <path d="M1 10h22" />
        </Svg>
      );
    case "receipt":
      return (
        <Svg size={size} className={className}>
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
          <path d="M8 10h8M8 14h4" />
        </Svg>
      );
    case "activity":
      return (
        <Svg size={size} className={className}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </Svg>
      );
    case "externalLink":
      return (
        <Svg size={size} className={className}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14L21 3" />
        </Svg>
      );
    case "logOut":
      return (
        <Svg size={size} className={className}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
      );
    case "truck":
      return (
        <Svg size={size} className={className}>
          <path d="M10 17h4V5H2v12h3" />
          <path d="M20 17h2v-3.34a1 1 0 0 0-.22-.626l-2.5-3.125A1 1 0 0 0 18.7 9H14" />
          <circle cx="7.5" cy="17.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </Svg>
      );
    case "clock":
      return (
        <Svg size={size} className={className}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </Svg>
      );
    case "sparkles":
      return (
        <Svg size={size} className={className}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
        </Svg>
      );
    case "tracking":
      return (
        <Svg size={size} className={className}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </Svg>
      );
    default:
      return <Svg size={size} className={className}><circle cx="12" cy="12" r="10" /></Svg>;
  }
}
