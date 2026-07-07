import { LoadingState } from "@/components/LoadingState";

export default function CheckoutLoading() {
  return (
    <main className="app-shell px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title="Preparing checkout..."
        description="Loading the offer summary and pickup details."
      />
    </main>
  );
}
