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
      title="Orders could not load"
      description="Your reservations could not be displayed. Try again to reload pickup codes and order history."
    />
  );
}
