import type { ReactElement } from "react";

export type IconName =
  | "camera" | "wallet" | "checklist" | "film" | "radar" | "map"
  | "sparkle" | "plane" | "users" | "user" | "sun" | "moon"
  | "chevron" | "close" | "download" | "share" | "pin"
  | "fork" | "glass" | "coffee" | "music" | "locate"
  | "calculator" | "mic" | "plus" | "trash" | "up" | "down" | "link" | "calendar";

const PATHS: Record<IconName, ReactElement> = {
  camera: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a1 1 0 0 1 1 1v2" />
      <path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H19a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z" />
      <circle cx="16" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  checklist: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3.5h6v1" />
      <path d="m8.5 10 1.3 1.3L12 9" />
      <path d="M14 10.2h2.5" />
      <path d="m8.5 15 1.3 1.3L12 14" />
      <path d="M14 15.2h2.5" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="m3.5 15 4.5-4 3.5 3 3-2.5 6 5" />
      <circle cx="15.5" cy="9" r="1.4" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 12 18 6" />
    </>
  ),
  map: (
    <>
      <path d="m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z" />
      <path d="M18.5 15.5c.25 1.6 1 2.35 2.5 2.5-1.5.15-2.25.9-2.5 2.5-.25-1.6-1-2.35-2.5-2.5 1.5-.15 2.25-.9 2.5-2.5z" />
    </>
  ),
  plane: (
    <path d="M10.2 20.5 11 15l-5.5 1.6-1-1.3L10.6 11 9.2 4.4l1.4-.6 4.1 5.6 4.3-1.7a1.6 1.6 0 0 1 1.2 3l-4.3 1.7-.6 7-1.4.6-2.1-4.4-1.4 3.6z" />
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8" />
      <path d="M17 14.3c1.9.6 3.1 2.2 3.5 4.7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.7" />
      <path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M19.5 14.5A7.8 7.8 0 0 1 9.5 4.5a7.8 7.8 0 1 0 10 10z" />,
  chevron: <path d="m9.5 6 6 6-6 6" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M6 12.5v5A2.5 2.5 0 0 0 8.5 20h7a2.5 2.5 0 0 0 2.5-2.5v-5" />
    </>
  ),
  fork: (
    <>
      <path d="M7 3v7a2 2 0 0 0 2 2v9" />
      <path d="M11 3v7a2 2 0 0 1-2 2" />
      <path d="M9 3v5" />
      <path d="M16.5 21V3c-2 1.5-3 4-3 7 0 1.7 1.3 3 3 3" />
    </>
  ),
  glass: (
    <>
      <path d="M6 4h12l-6 8z" />
      <path d="M12 12v8" />
      <path d="M8.5 20h7" />
    </>
  ),
  coffee: (
    <>
      <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M9 3.5v2.5M12.5 3.5v2.5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  calculator: (
    <>
      <rect x="5.5" y="3.5" width="13" height="17" rx="2.5" />
      <path d="M8.5 7.5h7" />
      <path d="M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01" strokeWidth="2.2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.8 11.5A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-2L17.5 7" />
    </>
  ),
  up: <path d="m6 14.5 6-6 6 6" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
};

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, className, strokeWidth = 1.7 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
