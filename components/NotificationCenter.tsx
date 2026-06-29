"use client";

import AppNotification, {
  type NotificationTone,
} from "@/components/AppNotification";
import {
  ARGADAAGDO_NOTIFICATION_EVENT,
  type AppNotification as AppNotificationEvent,
} from "@/lib/notifications";
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
      className="fixed bottom-4 right-4 z-[70] grid w-[calc(100%-2rem)] max-w-sm gap-3 sm:bottom-6 sm:right-6 sm:w-full"
    >
      {notifications.map((notification) => (
        <AppNotification
          key={notification.id}
          tone={notification.tone}
          title={notification.title}
          onDismiss={() => removeNotification(notification.id)}
        >
          {notification.message}
        </AppNotification>
      ))}
    </div>
  );
}
