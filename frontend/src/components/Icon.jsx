const ICONS = {
  bag: <path d="M6 8h12l1 12H5L6 8zm3 0a3 3 0 016 0" />,
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  receipt: <path d="M6 4h12v16l-3-2-3 2-3-2-3 2zM9 9h6M9 13h6" />,
  shield: <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" />,
  logout: <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  check: <path d="M5 13l4 4L19 7" />,
  package: <path d="M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10" />,
  coupon: <path d="M4 8a2 2 0 002-2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a2 2 0 000-4zM10 9l4 6" />,
  chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  barcode: <path d="M5 5v14M8 5v14M12 5v14M15 5v14M19 5v14" />,
};

export default function Icon({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {ICONS[name]}
    </svg>
  );
}
