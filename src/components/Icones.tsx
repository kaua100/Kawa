const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IcZap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.2A9.4 9.4 0 1 0 12 2.6z" fill="currentColor" />
    <path
      d="M8.6 7.4c.3-.3.8-.3 1 .1l1 1.7c.2.4.1.8-.2 1.1l-.6.5a6 6 0 0 0 3.3 3.3l.5-.6c.3-.3.7-.4 1.1-.2l1.7 1c.4.2.4.7.1 1l-.8.8c-.6.6-1.5.8-2.3.5a9.6 9.6 0 0 1-5.4-5.4c-.3-.8-.1-1.7.5-2.3z"
      fill="var(--zap-icone, #19a34a)"
    />
  </svg>
);
export const IcPino = () => (
  <svg {...base}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);
export const IcFone = () => (
  <svg {...base}>
    <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
  </svg>
);
export const IcInsta = () => (
  <svg {...base}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="3.8" />
    <circle cx="17" cy="7" r=".6" fill="currentColor" />
  </svg>
);
export const IcSite = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5z" />
  </svg>
);
export const IcFechar = () => (
  <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IcHoje = () => (
  <svg {...base}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" /></svg>
);
export const IcLeads = () => (
  <svg {...base}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
);
export const IcBusca = () => (
  <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
);
export const IcMsg = () => (
  <svg {...base}><path d="M4 5h16v11H9l-5 4V5z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
);
export const IcVoltar = () => (
  <svg {...base}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IcGrafico = () => (
  <svg {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IcSair = () => (
  <svg {...base}><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" /></svg>
);
export const IcAmanha = () => (
  <svg {...base}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IcConfig = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const IcConversa = () => (
  <svg {...base}>
    <path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3.5 21l1.4-4.8A8.5 8.5 0 1 1 21 12z" />
  </svg>
);
export const IcEnviar = () => (
  <svg {...base}>
    <path d="M22 2 11 13" />
    <path d="m22 2-7 20-4-9-9-4z" />
  </svg>
);
export const IcSites = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M3 9h18" />
    <path d="M7 6.5h.01M9.5 6.5h.01" />
    <path d="M8 14l2 2-2 2M12.5 18h3.5" />
  </svg>
);
export const IcBaixar = () => (
  <svg {...base}>
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);
