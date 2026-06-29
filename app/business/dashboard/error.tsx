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
      title="Business dashboard could not load"
      description="Your business tools hit a temporary problem. Try again to reload offers, reservations and ratings."
    />
  );
}
