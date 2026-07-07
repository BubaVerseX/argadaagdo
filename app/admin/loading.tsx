import { LoadingState } from "@/components/LoadingState";

export default function AdminLoading() {
  return (
    <main className="app-shell px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title="Loading admin dashboard..."
        description="Checking businesses, offers, orders and marketplace health."
      />
    </main>
  );
}
