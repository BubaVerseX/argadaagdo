"use client";

import Navbar from "@/components/Navbar";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="flex min-h-[70vh] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl sm:h-20 sm:w-20 sm:text-4xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-3xl font-black sm:mt-6 sm:text-4xl">
            Something went wrong
          </h1>

          <p className="mt-4 font-semibold text-gray-600">
            Please try again.
          </p>

          <button
            onClick={reset}
            className="mt-7 min-h-12 w-full rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 sm:mt-8 sm:w-auto sm:py-4"
          >
            Try Again
          </button>
        </div>
      </section>
    </main>
  );
}
