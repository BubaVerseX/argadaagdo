"use client";

import AppNotification, {
  type NotificationTone,
} from "@/components/AppNotification";
import {
  ARGADAAGDO_NOTIFICATION_EVENT,
  getLocalizedNotificationContent,
  type AppNotification as AppNotificationEvent,
} from "@/lib/notifications";
import { useLanguage } from "@/lib/useLanguage";
import { useCallback, useEffect, useRef, useState } from "react";

type ToastNotification = AppNotificationEvent & {
  id: string;
  tone: NotificationTone;
};

function getToneForEvent(event: AppNotificationEvent["event"]): NotificationTone {
  if (event === "order_cancelled") return "warning";
  if (event === "pickup_reminder") return "info";
  return "success";
}

export default function NotificationCenter() {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeNotification = useCallback((id: string) => {
    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => notification.id !== id)
    );

    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  useEffect(() => {
    function handleNotification(event: Event) {
      const notification = (event as CustomEvent<AppNotificationEvent>).detail;

      if (!notification) return;

      const id = `${notification.event}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const nextNotification: ToastNotification = {
        ...notification,
        id,
        tone: getToneForEvent(notification.event),
      };

      setNotifications((currentNotifications) =>
        [nextNotification, ...currentNotifications].slice(0, 3)
      );

      timers.current[id] = setTimeout(() => removeNotification(id), 6000);
    }

    window.addEventListener(ARGADAAGDO_NOTIFICATION_EVENT, handleNotification);

    return () => {
      window.removeEventListener(
        ARGADAAGDO_NOTIFICATION_EVENT,
        handleNotification
      );
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed right-4 bottom-[calc(1rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] z-[70] grid w-[calc(100%-2rem)] max-w-sm gap-3 sm:right-6 sm:bottom-[calc(1.5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:w-full"
    >
      {notifications.map((notification) => {
        const content = getLocalizedNotificationContent(notification, language);

        return (
          <AppNotification
            key={notification.id}
            tone={notification.tone}
            title={content.title}
            onDismiss={() => removeNotification(notification.id)}
          >
            {content.message}
          </AppNotification>
        );
      })}
    </div>
  );
}
