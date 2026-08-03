import type { ReactNode } from "react";
import {
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
  XCircleIcon,
  XIcon,
  type IconProps,
} from "@/components/icons";
import type { ComponentType } from "react";

export type NotificationTone = "success" | "info" | "warning" | "error";

const toneStyles: Record<
  NotificationTone,
  { wrapper: string; icon: string; role: "status" | "alert"; Icon: ComponentType<IconProps> }
> = {
  success: {
    wrapper: "soft-raised text-[#2e2a22]",
    icon: "bg-[#a67c52] text-white",
    role: "status",
    Icon: CheckIcon,
  },
  info: {
    wrapper: "bg-blue-50 text-blue-950",
    icon: "bg-blue-600 text-white",
    role: "status",
    Icon: InfoIcon,
  },
  warning: {
    wrapper: "bg-yellow-50 text-yellow-950",
    icon: "bg-yellow-500 text-yellow-950",
    role: "status",
    Icon: AlertTriangleIcon,
  },
  error: {
    wrapper: "bg-red-50 text-red-900",
    icon: "bg-red-600 text-white",
    role: "alert",
    Icon: XCircleIcon,
  },
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
      className={`rounded-2xl p-4 ${styles.wrapper}`}
      role={styles.role}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
        >
          <styles.Icon className="h-4 w-4" strokeWidth={2} />
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
          >
            <XIcon className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
