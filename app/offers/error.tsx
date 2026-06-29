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
      title="Offers could not load"
      description="The marketplace view hit a temporary problem. Try again to reload the latest offers."
    />
  );
}
