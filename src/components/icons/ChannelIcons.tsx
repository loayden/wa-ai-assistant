import { MessageCircle } from "lucide-react";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#25D366"
        d="M12.04 2C6.57 2 2.12 6.37 2.12 11.74c0 1.72.46 3.39 1.34 4.86L2 22l5.54-1.43a10.1 10.1 0 0 0 4.5 1.06c5.47 0 9.92-4.37 9.92-9.74S17.51 2 12.04 2Z"
      />
      <path
        fill="#fff"
        d="M17.8 14.53c-.25-.12-1.49-.72-1.72-.8-.23-.08-.4-.12-.57.12-.17.25-.65.8-.8.96-.15.17-.3.19-.55.06-.25-.12-1.05-.38-2-1.2-.74-.64-1.24-1.43-1.39-1.67-.14-.25-.02-.38.11-.5.12-.11.25-.29.37-.43.13-.14.17-.25.26-.41.08-.17.04-.31-.02-.44-.06-.12-.57-1.35-.78-1.85-.2-.48-.42-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.25-.88.84-.88 2.05s.9 2.38 1.03 2.55c.12.16 1.77 2.63 4.29 3.69.6.25 1.07.4 1.43.52.6.19 1.15.16 1.58.1.48-.07 1.49-.59 1.7-1.16.21-.57.21-1.06.15-1.16-.06-.1-.23-.16-.48-.28Z"
      />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="kallem-ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F9CE34" />
          <stop offset="48%" stopColor="#EE2A7B" />
          <stop offset="100%" stopColor="#6228D7" />
        </linearGradient>
      </defs>
      <path
        fill="url(#kallem-ig-gradient)"
        d="M7.7 2h8.6A5.7 5.7 0 0 1 22 7.7v8.6a5.7 5.7 0 0 1-5.7 5.7H7.7A5.7 5.7 0 0 1 2 16.3V7.7A5.7 5.7 0 0 1 7.7 2Zm0 2A3.7 3.7 0 0 0 4 7.7v8.6A3.7 3.7 0 0 0 7.7 20h8.6a3.7 3.7 0 0 0 3.7-3.7V7.7A3.7 3.7 0 0 0 16.3 4H7.7Zm4.3 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm5.05-2.45a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"
      />
    </svg>
  );
}

export function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#0084FF"
        d="M12 2C6.48 2 2 6.13 2 11.23c0 2.9 1.45 5.49 3.72 7.18V22l3.4-1.86c.91.25 1.88.38 2.88.38 5.52 0 10-4.13 10-9.23S17.52 2 12 2Zm1 12.41-2.55-2.73-4.98 2.73 5.46-5.8 2.62 2.73 4.91-2.73L13 14.41Z"
      />
    </svg>
  );
}

export function ChannelIcon({ channel, className }: { channel?: string | null; className?: string }) {
  if (channel === "whatsapp") {
    return <WhatsAppIcon className={className} />;
  }

  if (channel === "instagram") {
    return <InstagramIcon className={className} />;
  }

  if (channel === "messenger") {
    return <MessengerIcon className={className} />;
  }

  return <MessageCircle className={className} aria-hidden="true" />;
}
