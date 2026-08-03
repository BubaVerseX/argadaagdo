import type { SVGProps } from "react";

/**
 * Shared line-art icon set for the soft-shadow design system.
 * Replaces all emoji/glyph icons across the app: 1.8px stroke, rounded
 * caps/joins, no fill (except where `filled` is explicitly toggled, e.g.
 * favorited heart / rated star). Color is inherited via `currentColor`, so
 * set text color on the wrapper (`text-[#a67c52]` for accent, muted grays
 * for inactive states).
 */

export type IconProps = SVGProps<SVGSVGElement>;

function base(children: React.ReactNode, extraProps: SVGProps<SVGSVGElement> = {}) {
  return function IconBase({ className = "h-5 w-5", strokeWidth = 1.8, ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...extraProps}
        {...props}
      >
        {children}
      </svg>
    );
  };
}

export const HomeIcon = base(
  <>
    <path d="M3.5 10.5 12 3.5l8.5 7" />
    <path d="M5.5 9v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9" />
    <path d="M9.5 20v-6h5v6" />
  </>
);

export const SearchIcon = base(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20.5 20.5 16 16" />
  </>
);

function HeartBase({ filled = false, className = "h-5 w-5", strokeWidth = 1.8, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 20.2s-7.6-4.6-10-9.3C.4 7.6 2 4.2 5.4 3.4c2-.5 4 .2 5.1 1.9l1.5 2.2 1.5-2.2c1.1-1.7 3.1-2.4 5.1-1.9 3.4.8 5 4.2 3.4 7.5-2.4 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}
export const HeartIcon = HeartBase;

export const ReceiptIcon = base(
  <>
    <path d="M6 3.5h12v17l-2.2-1.4L13.6 20l-2.2-1.4L9.2 20 7 18.6 4.8 20V6a2.5 2.5 0 0 1 1.2-2.1Z" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
  </>
);

export const UserIcon = base(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
  </>
);

export const LayoutGridIcon = base(
  <>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
  </>
);

export const TagIcon = base(
  <>
    <path d="M12.5 3.5H6A2.5 2.5 0 0 0 3.5 6v6.5a1 1 0 0 0 .3.7l9 9a1 1 0 0 0 1.4 0l7-7a1 1 0 0 0 0-1.4l-9-9a1 1 0 0 0-.7-.3Z" />
    <circle cx="8.25" cy="8.25" r="1.25" />
  </>
);

export const BellIcon = base(
  <>
    <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14.5 6 10.5Z" />
    <path d="M10 19a2.2 2.2 0 0 0 4 0" />
  </>
);

export const MoreHorizontalIcon = base(
  <>
    <circle cx="5.5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="18.5" cy="12" r="1.4" />
  </>
);

export const ChevronDownIcon = base(<path d="m6 9 6 6 6-6" />);
export const ChevronRightIcon = base(<path d="m9 6 6 6-6 6" />);
export const ArrowLeftIcon = base(<path d="M20 12H4M4 12l6.5-6.5M4 12l6.5 6.5" />);
export const XIcon = base(<path d="M6 6l12 12M18 6 6 18" />);
export const MenuIcon = base(<path d="M4 7h16M4 12h16M4 17h16" />);
export const CheckIcon = base(<path d="M5 12.5 9.5 17 19 6.5" />);

function StarBase({ filled = false, className = "h-5 w-5", strokeWidth = 1.8, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3.5 14.7 9l6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9Z" />
    </svg>
  );
}
export const StarIcon = StarBase;

export const MapPinIcon = base(
  <>
    <path d="M12 21S5 14.5 5 9.5a7 7 0 1 1 14 0C19 14.5 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </>
);

export const ClockIcon = base(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 2" />
  </>
);

export const StoreIcon = base(
  <>
    <path d="M4 9.5 5 4h14l1 5.5" />
    <path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </>
);

export const SmartphoneIcon = base(
  <>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.2" />
    <path d="M11 18.5h2" />
  </>
);

export const WifiOffIcon = base(
  <>
    <path d="M3 3l18 18" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0" />
    <path d="M5 12.5a10 10 0 0 1 3.5-2.3M12 8a10 10 0 0 1 7 2.7" />
    <path d="M15.5 6a13.9 13.9 0 0 1 3.5 2.2" />
    <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
  </>
);

export const ShoppingBagIcon = base(
  <>
    <path d="M6.5 8.5h11l1 12h-13z" />
    <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
  </>
);

export const LockIcon = base(
  <>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </>
);

export const MailIcon = base(
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 6.5 8 6.5 8-6.5" />
  </>
);

export const PhoneIcon = base(
  <path d="M6 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4.5 5.1 1.5 1.5 0 0 1 6 3.5Z" />
);

export const InfoIcon = base(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="7.8" r="0.15" fill="currentColor" />
  </>
);

export const AlertTriangleIcon = base(
  <>
    <path d="M12 4 21.5 20h-19Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r="0.15" fill="currentColor" />
  </>
);

export const XCircleIcon = base(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </>
);

export const CheckCircleIcon = base(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8 12.5 2.7 2.7L16.5 9" />
  </>
);

export const SettingsIcon = base(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3.5 12h2M18.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);

export const LogOutIcon = base(
  <>
    <path d="M9.5 4.5h-4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h4" />
    <path d="M14 16l4.5-4-4.5-4" />
    <path d="M18.5 12h-11" />
  </>
);

export const PlusIcon = base(<path d="M12 5v14M5 12h14" />);
export const TrashIcon = base(
  <>
    <path d="M5 7h14" />
    <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
    <path d="M7 7l1 13h8l1-13" />
  </>
);

export const EditIcon = base(
  <>
    <path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5v-4Z" />
  </>
);

export const UploadIcon = base(
  <>
    <path d="M12 15.5V4.5M8 8.5 12 4.5l4 4" />
    <path d="M5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </>
);

export const CalendarIcon = base(
  <>
    <rect x="4" y="5.5" width="16" height="15" rx="2" />
    <path d="M4 10h16M8 3.5v3M16 3.5v3" />
  </>
);

export const TrendingUpIcon = base(
  <>
    <path d="m4 16 5.5-6 4 3.5L20 6" />
    <path d="M15 6h5v5" />
  </>
);

export const BarChartIcon = base(
  <>
    <path d="M5 20V10M12 20V4M19 20v-7" />
  </>
);

export const UsersIcon = base(
  <>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19c1.1-3 3.3-4.5 5.5-4.5s4.4 1.5 5.5 4.5" />
    <path d="M15.5 6.5a3 3 0 0 1 0 5.7" />
    <path d="M17.5 14.7c1.7.6 3 1.9 3.8 4.3" />
  </>
);

export const PercentIcon = base(
  <>
    <path d="M19 5 5 19" />
    <circle cx="7" cy="7" r="2.3" />
    <circle cx="17" cy="17" r="2.3" />
  </>
);

export const FilterIcon = base(<path d="M4 5.5h16l-6 7.5v5.5l-4 2v-7.5Z" />);

export const ShieldIcon = base(
  <path d="M12 3.5 19 6v6c0 5-3 7.8-7 8.5-4-.7-7-3.5-7-8.5V6Z" />
);

export const PackageIcon = base(
  <>
    <path d="M4 8 12 4l8 4-8 4-8-4Z" />
    <path d="M4 8v8l8 4 8-4V8" />
    <path d="M12 12v8" />
  </>
);
