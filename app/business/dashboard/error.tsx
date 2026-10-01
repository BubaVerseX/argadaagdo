"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function BusinessDashboardError({
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
      route="/business/dashboard"
      title={{
        en: "Business dashboard could not load",
        ka: "ბიზნეს პანელი ვერ ჩაიტვირთა",
      }}
      description={{
        en: "Your business tools hit a temporary problem. Try again to reload offers, reservations and ratings.",
        ka: "ბიზნესის ინსტრუმენტებში დროებითი პრობლემა წარმოიშვა. სცადე ხელახლა, რომ შეთავაზებები, ჯავშნები და შეფასებები თავიდან ჩაიტვირთოს.",
      }}
    />
  );
}
