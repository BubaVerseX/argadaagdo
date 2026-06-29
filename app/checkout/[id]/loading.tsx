import { LoadingState } from "@/components/LoadingState";

export default function CheckoutLoading() {
  return (
    <main className="min-h-screen bg-[#F7F6EF] px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title="Preparing checkout..."
        description="Loading the offer summary and pickup details."
      />
    </main>
  );
}
