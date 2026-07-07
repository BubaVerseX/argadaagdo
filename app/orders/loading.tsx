import { LoadingState } from "@/components/LoadingState";

export default function OrdersLoading() {
  return (
    <main className="app-shell px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title="Loading orders..."
        description="Preparing your reservations, pickup codes and order history."
      />
    </main>
  );
}
