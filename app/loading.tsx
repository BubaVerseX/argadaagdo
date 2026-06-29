import { LoadingState } from "@/components/LoadingState";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6EF] px-4 py-8 sm:px-6">
      <LoadingState description="Preparing fresh food rescue offers." />
    </main>
  );
}
