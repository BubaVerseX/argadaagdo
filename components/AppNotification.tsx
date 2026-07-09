import type { ReactNode } from "react";

export type NotificationTone = "success" | "info" | "warning" | "error";

const toneStyles: Record<
  NotificationTone,
  { wrapper: string; icon: string; role: "status" | "alert" }
> = {
  success: {
    wrapper: "bg-white text-[#1a1815]",
    icon: "bg-[#5c7a5c] text-white",
    role: "status",
  },
  info: {
    wrapper: "bg-blue-50 text-blue-950",
    icon: "bg-blue-600 text-white",
    role: "status",
  },
  warning: {
    wrapper: "bg-yellow-50 text-yellow-950",
    icon: "bg-yellow-500 text-yellow-950",
    role: "status",
  },
  error: {
    wrapper: "bg-red-50 text-red-900",
    icon: "bg-red-600 text-white",
    role: "alert",
  },
};

const toneIcons: Record<NotificationTone, string> = {
  success: "✓",
  info: "i",
  warning: "!",
  error: "!",
};

type AppNotificationProps = {
  children: ReactNode;
  tone?: NotificationTone;
  title?: string;
  action?: ReactNode;
  onDismiss?: () => void;
};

export default function AppNotification({
  children,
  tone = "info",
  title,
  action,
  onDismiss,
}: AppNotificationProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`rounded-2xl p-4 shadow-[var(--shadow-soft)] ${styles.wrapper}`}
      role={styles.role}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${styles.icon}`}
        >
          {toneIcons[tone]}
        </span>

        <div className="min-w-0 flex-1">
          {title && <p className="font-black">{title}</p>}
          <div className="text-sm font-semibold leading-6 sm:text-base">
            {children}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 font-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
