// Inline SVG icon set (stroke-based, lucide-style). No emoji anywhere in the
// UI — every pictogram goes through this component so sizing/color follow CSS.
import type { SVGProps } from 'react';

const PATHS: Record<string, React.ReactNode> = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15v3M12 10v8M17 6v12" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  cart: <><path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H8.7a2 2 0 0 1-2-1.6L5 4H2" /><circle cx="9.5" cy="20" r="1.4" /><circle cx="17.5" cy="20" r="1.4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.8 14.9c2.2.7 3.7 2.3 3.7 5.1" /></>,
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  bag: <><path d="M6 7h12l1 13a1.8 1.8 0 0 1-1.8 2H6.8A1.8 1.8 0 0 1 5 20L6 7Z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 19 5.5-5.5 3 3L17 13l4 4" /></>,
  ticket: <path d="M3 9a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2.5 2.5 0 0 0 0-5V9ZM13 6.5v2M13 11v2M13 15.5v2" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  star: <path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7L12 3Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5 13.8 4a8.5 8.5 0 0 1 2.8 1.2l2.3-.5 1.8 3.1-1.6 1.8a8.6 8.6 0 0 1 0 3l1.6 1.8-1.8 3.1-2.3-.5a8.5 8.5 0 0 1-2.8 1.2L12 21.5 10.2 20a8.5 8.5 0 0 1-2.8-1.2l-2.3.5-1.8-3.1 1.6-1.8a8.6 8.6 0 0 1 0-3L3.3 9.6l1.8-3.1 2.3.5A8.5 8.5 0 0 1 10.2 4L12 2.5Z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  store: <><path d="M4 7 5.5 3h13L20 7" /><path d="M4 7h16v3a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0V7ZM5 12.5V21h14v-8.5M9 21v-5h6v5" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="M5 5l14 14M19 5 5 19" />,
  'chevron-left': <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  heart: <path d="M12 20.5S3.5 15.5 3.5 9.3A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.5 2.7c0 6.2-8.5 11.2-8.5 11.2Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  shield: <path d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V6l8-3.5Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  'credit-card': <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6 15h4" /></>,
  paypal: <path d="M7.5 20.5 9 13h4.2c3 0 5.3-2 5.3-4.7C18.5 5.9 16.6 4 13.8 4H7.9L5.5 16.5h3.3M9.8 20.5h3.4c2.8 0 4.9-1.9 5.3-4.5" />,
  send: <path d="M21 3 3 10.5l7 3 3 7L21 3ZM10 14 21 3" />,
  gift: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M12 8v13M12 8s-4.5.3-5.5-1.7C5.7 4.7 7 3 8.5 3c2.5 0 3.5 5 3.5 5Zm0 0s4.5.3 5.5-1.7C18.3 4.7 17 3 15.5 3c-2.5 0-3.5 5-3.5 5Z" /></>,
  truck: <><path d="M2.5 6h12v11h-12zM14.5 10h4l2.5 3.5V17h-6.5" /><circle cx="6.5" cy="18.5" r="1.8" /><circle cx="17.5" cy="18.5" r="1.8" /></>,
  chat: <path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12Z" />,
  refresh: <path d="M20 8a8.5 8.5 0 0 0-15-1.5M4 3.5V8h4.5M4 16a8.5 8.5 0 0 0 15 1.5M20 20.5V16h-4.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  'arrow-right': <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13a2 2 0 0 0 2 1.9h5a2 2 0 0 0 2-1.9l1-13M10 11v6M14 11v6" />,
  upload: <path d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  home: <path d="m3 11 9-8 9 8M5.5 9.5V21h13V9.5" />,
  google: <><circle cx="12" cy="12" r="9" /><path d="M16.5 12H12m4.5 0a4.5 4.5 0 1 1-1.3-3.2" /></>,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />,
  key: <><circle cx="8" cy="15" r="4.5" /><path d="m11.2 11.8 8.3-8.3M17 6.5 19.5 9M14 9.5l2 2" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2M3.5 12H2" /></>,
  package: <><path d="M16.5 9.4 7.55 4.24" /><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  news: <><path d="M4 4h13a0 0 0 0 1 0 0v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V4Z" /><path d="M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2" /><path d="M8 8h5M8 12h5M8 16h5" /></>,
  facebook: <path d="M14 8h2.5V4.5H14A4.5 4.5 0 0 0 9.5 9v2.5H7V15h2.5v6H13v-6h2.5l.5-3.5h-3V9a1 1 0 0 1 1-1Z" />,
  twitter: <path d="m4 4 7.1 9.3L4.4 20h2.3l5.4-5.4L16.5 20H20l-7.4-9.7L18.9 4h-2.3l-4.9 5L7.5 4H4Z" />,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><path d="M17.2 6.8h.01" /></>,
  youtube: <><path d="M21.3 8s-.2-1.4-.8-2c-.7-.8-1.5-.8-1.9-.9C15.9 4.9 12 4.9 12 4.9s-3.9 0-6.6.2c-.4.1-1.2.1-1.9.9-.6.6-.8 2-.8 2S2.5 9.6 2.5 11.3v1.5c0 1.6.2 3.3.2 3.3s.2 1.4.8 2c.7.8 1.7.7 2.1.8 1.5.2 6.4.2 6.4.2s3.9 0 6.6-.2c.4-.1 1.2-.1 1.9-.9.6-.6.8-2 .8-2s.2-1.6.2-3.3v-1.5c0-1.6-.2-3.2-.2-3.2Z" /><path d="m10 9.7 5 2.7-5 2.8V9.7Z" /></>,
  telegram: <path d="m21 4.5-3 15.4s-.4 1-1.5.5l-5-3.8-.1-.1c.7-.6 6.1-5.5 6.3-5.7.4-.3.2-.5-.2-.3L9.6 15 6.6 14s-.5-.2-.5-.5c0-.4.5-.6.5-.6l12.9-5s1.5-.7 1.5.6Z" />,
  discord: <><path d="M8.5 17c-2.5 1.5-4 1-4 1s.6-4.7 1.6-7.9C6.7 8 8.5 6.7 10 6.5l.6 1.2a12 12 0 0 1 2.8 0L14 6.5c1.5.2 3.3 1.5 3.9 3.6 1 3.2 1.6 7.9 1.6 7.9s-1.5.5-4-1" /><path d="M8.5 17c1 .6 2.2 1 3.5 1s2.5-.4 3.5-1M9.7 12.4h.01M14.3 12.4h.01" /></>,
};

export type IconName = keyof typeof PATHS & string;

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
  ...props
}: { name: string; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name] || <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
