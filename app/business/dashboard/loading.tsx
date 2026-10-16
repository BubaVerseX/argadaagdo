import { LoadingState } from "@/components/LoadingState";

export default function BusinessDashboardLoading() {
  return (
    <main className="app-shell px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title={{
          en: "Loading business dashboard...",
          ka: "ბიზნეს პანელი იტვირთება...",
        }}
        description={{
          en: "Preparing offers, reservations, pickup tasks and ratings.",
          ka: "მზადდება შეთავაზებები, ჯავშნები, წაღების დავალებები და შეფასებები.",
        }}
      />
    </main>
  );
}
