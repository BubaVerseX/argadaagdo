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
      title={{
        en: "Businesses could not load",
        ka: "ბიზნესები ვერ ჩაიტვირთა",
      }}
      description={{
        en: "The business directory hit a temporary problem. Try again to reload verified businesses.",
        ka: "ბიზნესების კატალოგში დროებითი პრობლემა წარმოიშვა. სცადე ხელახლა, რომ დამოწმებული ბიზნესები თავიდან ჩაიტვირთოს.",
      }}
    />
  );
}
