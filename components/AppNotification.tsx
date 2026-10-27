"use client";

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
import { useLanguage } from "@/lib/useLanguage";

export type NotificationTone = "success" | "info" | "warning" | "error";

const toneStyles: Record<
  NotificationTone,
  { wrapper: string; icon: string; role: "status" | "alert"; Icon: ComponentType<IconProps> }
> = {
  success: {
    wrapper: "ui-card text-cream",
    icon: "bg-mint text-ink",
    role: "status",
    Icon: CheckIcon,
  },
  info: {
    wrapper: "border border-line bg-well text-cream",
    icon: "bg-sage text-ink",
    role: "status",
    Icon: InfoIcon,
  },
  warning: {
    wrapper: "border border-warning-line bg-warning-soft text-cream",
    icon: "bg-warning text-ink",
    role: "status",
    Icon: AlertTriangleIcon,
  },
  error: {
    wrapper: "border border-danger-line bg-danger-soft text-cream",
    icon: "bg-danger-solid text-cream",
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
  const { language } = useLanguage();

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
          {title && <p className="font-semibold">{title}</p>}
          <div className="text-sm font-semibold leading-6 sm:text-base">
            {children}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={
              language === "ka"
                ? "შეტყობინების დახურვა"
                : "Dismiss notification"
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-well transition hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <XIcon className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
