"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function AdminError({
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
      route="/admin"
      title="Admin dashboard could not load"
      description="Marketplace operations could not be displayed. Try again to reload approval and health data."
    />
  );
}
