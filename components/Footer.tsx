import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-black/5 bg-white sm:mt-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-12 md:py-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-xl text-white">
              🥡
            </div>

            <div>
              <h2 className="text-xl font-black text-green-800 sm:text-2xl">
                ArGadaagdo
              </h2>
              <p className="font-bold text-gray-500">
                Food rescue marketplace
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-md font-semibold leading-7 text-gray-700">
            Helping Tbilisi save good food, support local businesses, and reduce
            daily food waste.
          </p>

          <Link
            href="/business/register"
            className="mt-6 inline-block rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800"
          >
            Register your business
          </Link>
        </div>

        <div>
          <h3 className="text-lg font-black text-gray-950">Explore</h3>

          <div className="mt-4 grid gap-3 font-bold text-gray-600">
            <Link href="/offers" className="hover:text-green-700">
              Offers
            </Link>

            <Link href="/orders" className="hover:text-green-700">
              My Orders
            </Link>

            <Link href="/business/register" className="hover:text-green-700">
              For Business
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-gray-950">Platform</h3>

          <div className="mt-4 grid gap-3 font-bold text-gray-600">
            <p>Pickup only</p>
            <p>Cash on pickup</p>
            <p>Tbilisi first</p>
            <p>Supabase powered</p>
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 px-5 py-6 sm:px-6 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm font-bold text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 ArGadaagdo. Built for reducing food waste in Georgia.</p>
          <p>Made with Next.js, Supabase and Tailwind CSS.</p>
        </div>
      </div>
    </footer>
  );
}
