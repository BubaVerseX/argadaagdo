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
      title="Checkout could not load"
      description="Your reservation step could not be prepared. Try again before reserving the offer."
    />
  );
}
