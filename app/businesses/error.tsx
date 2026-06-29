"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function BusinessesError({
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
      route="/businesses"
      title="Businesses could not load"
      description="The business directory hit a temporary problem. Try again to reload verified businesses."
    />
  );
}
