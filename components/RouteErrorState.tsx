"use client";

import Navbar from "@/components/Navbar";
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
        <div className="w-full max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl font-black text-red-700 sm:h-20 sm:w-20">
            !
          </div>

          <h1 className="mt-5 text-3xl font-black sm:mt-6 sm:text-4xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-md font-semibold leading-7 text-gray-600">
            {description}
          </p>

          <button
            type="button"
            onClick={reset}
            className="mt-7 min-h-12 w-full rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 sm:mt-8 sm:w-auto sm:py-4"
          >
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
