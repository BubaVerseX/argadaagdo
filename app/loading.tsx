export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6EF] px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl sm:h-20 sm:w-20 sm:text-4xl">
          🥡
        </div>

        <h1 className="mt-5 text-2xl font-black text-gray-950 sm:mt-6 sm:text-3xl">
          Loading ArGadaagdo...
        </h1>

        <p className="mt-3 font-semibold text-gray-600">
          Preparing fresh food rescue offers.
        </p>
      </div>
    </main>
  );
}
