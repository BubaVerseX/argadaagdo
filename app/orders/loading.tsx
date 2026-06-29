import { LoadingState } from "@/components/LoadingState";

export default function OrdersLoading() {
  return (
    <main className="min-h-screen bg-[#F7F6EF] px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title="Loading orders..."
        description="Preparing your reservations, pickup codes and order history."
      />
    </main>
  );
}
