import { LoadingState } from "@/components/LoadingState";

export default function BusinessesLoading() {
  return (
    <main className="min-h-screen bg-[#F7F6EF] px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title="Loading businesses..."
        description="Checking verified local businesses."
      />
    </main>
  );
}
