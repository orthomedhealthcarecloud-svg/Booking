import type { JSX } from 'react';

export type IconName =
  | 'video' | 'chat' | 'calendar' | 'clock' | 'user' | 'file' | 'upload'
  | 'check' | 'chevronRight' | 'chevronLeft' | 'chevronDown' | 'plus'
  | 'settings' | 'pill' | 'home' | 'list' | 'inbox' | 'bell' | 'paperclip'
  | 'send' | 'phone' | 'lock' | 'search' | 'edit' | 'download' | 'moreH'
  | 'shield' | 'inr' | 'x';

const paths: Record<IconName, JSX.Element> = {
  video: <><rect x="2.5" y="6" width="12" height="12" rx="2" /><path d="M15 10l5-3v10l-5-3z" /></>,
  chat: <><path d="M4 5h16v11H8l-4 4z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  file: <><path d="M14 3H6v18h12V7zM14 3v4h4" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 17v3h16v-3" /></>,
  check: <><path d="M5 12l4 4 10-10" /></>,
  chevronRight: <><path d="M9 6l6 6-6 6" /></>,
  chevronLeft: <><path d="M15 6l-6 6 6 6" /></>,
  chevronDown: <><path d="M6 9l6 6 6-6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2" /></>,
  pill: <><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" /><path d="M8 8l8 8" transform="rotate(-30 12 12)" /></>,
  home: <><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-7h-6v7H5a1 1 0 0 1-1-1z" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01" /></>,
  inbox: <><path d="M3 14l4-9h10l4 9M3 14v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5M3 14h5l2 3h4l2-3h5" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3zM10 20a2 2 0 0 0 4 0" /></>,
  paperclip: <><path d="M21 11l-9 9a5 5 0 1 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 1 1-3-3l8-8" /></>,
  send: <><path d="M3 12l18-9-5 19-4-9z" /></>,
  phone: <><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></>,
  edit: <><path d="M4 20h4l10-10-4-4L4 16zM14 6l4 4" /></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></>,
  moreH: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z" /></>,
  inr: <><path d="M7 5h10M7 9h10M9 5c5 0 5 8 0 8h-2l8 6" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
