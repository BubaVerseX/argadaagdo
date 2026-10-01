"use client";

import { RouteErrorState } from "@/components/RouteErrorState";

export default function ErrorPage({
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
      route="app"
      title={{
        en: "Something went wrong",
        ka: "მოხდა შეცდომა",
      }}
      description={{
        en: "Please try again. If this keeps happening, contact support with the page you were using.",
        ka: "გთხოვ, სცადე ხელახლა. თუ პრობლემა განმეორდება, დაუკავშირდი მხარდაჭერას და მიუთითე გვერდი, რომელსაც იყენებდი.",
      }}
    />
  );
}
