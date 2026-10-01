"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function CheckoutError({
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
      route="/checkout/[id]"
      title={{
        en: "Checkout could not load",
        ka: "გადახდის გვერდი ვერ ჩაიტვირთა",
      }}
      description={{
        en: "Your reservation step could not be prepared. Try again before reserving the offer.",
        ka: "ჯავშნის ეტაპი ვერ მომზადდა. შეთავაზების დაჯავშნამდე სცადე ხელახლა.",
      }}
    />
  );
}
