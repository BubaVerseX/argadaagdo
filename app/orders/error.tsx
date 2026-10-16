"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      route="/orders"
      title={{
        en: "Orders could not load",
        ka: "შეკვეთები ვერ ჩაიტვირთა",
      }}
      description={{
        en: "Your reservations could not be displayed. Try again to reload pickup codes and order history.",
        ka: "შენი ჯავშნები ვერ გამოჩნდა. სცადე ხელახლა, რომ წაღების კოდები და შეკვეთების ისტორია თავიდან ჩაიტვირთოს.",
      }}
    />
  );
}
