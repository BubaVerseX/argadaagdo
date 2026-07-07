import { LoadingState } from "@/components/LoadingState";

export default function OffersLoading() {
  return (
    <main className="app-shell px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title="Loading offers..."
        description="Checking the latest surprise bags from local businesses."
      />
    </main>
  );
}
