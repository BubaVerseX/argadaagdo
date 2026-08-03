"use client";

import Navbar from "@/components/Navbar";
import { AlertTriangleIcon } from "@/components/icons";
import { logAppError } from "@/lib/errors";
import { useEffect } from "react";

type RouteErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  route: string;
};

export function RouteErrorState({
  error,
  reset,
  title,
  description,
  route,
}: RouteErrorStateProps) {
  useEffect(() => {
    logAppError("Route error boundary triggered", error, {
      route,
      digest: error.digest,
    });
  }, [error, route]);

  return (
    <main className="app-shell">
      <Navbar />

      <section className="flex min-h-[70vh] items-center justify-center px-4 py-8 sm:px-6">
        <div className="soft-raised w-full max-w-xl rounded-3xl p-6 text-center sm:rounded-[2rem] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700 sm:h-20 sm:w-20">
            <AlertTriangleIcon className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.8} />
          </div>

          <h1 className="mt-5 text-3xl font-black text-[#2e2a22] sm:mt-6 sm:text-4xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-md font-semibold leading-7 text-[#6b6152]">
            {description}
          </p>

          <button
            type="button"
            onClick={reset}
            className="premium-button mt-7 w-full px-8 py-3 sm:mt-8 sm:w-auto sm:py-4"
          >
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
