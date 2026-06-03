import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="flex min-h-[70vh] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl sm:h-20 sm:w-20 sm:text-4xl">
            🥡
          </div>

          <h1 className="mt-5 text-3xl font-black sm:mt-6 sm:text-5xl">
            Page not found
          </h1>

          <p className="mt-4 font-semibold text-gray-600">
            This page does not exist or the link is incorrect.
          </p>

          <Link
            href="/offers"
            className="mt-7 inline-block min-h-12 w-full rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 sm:mt-8 sm:w-auto sm:py-4"
          >
            Browse Offers
          </Link>
        </div>
      </section>
    </main>
  );
}
