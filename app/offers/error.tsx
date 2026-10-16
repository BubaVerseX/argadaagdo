"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function OffersError({
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
      route="/offers"
      title={{
        en: "Offers could not load",
        ka: "შეთავაზებები ვერ ჩაიტვირთა",
      }}
      description={{
        en: "The marketplace view hit a temporary problem. Try again to reload the latest offers.",
        ka: "მარკეტის ხედში დროებითი პრობლემა წარმოიშვა. სცადე ხელახლა, რომ უახლესი შეთავაზებები თავიდან ჩაიტვირთოს.",
      }}
    />
  );
}
