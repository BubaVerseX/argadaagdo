import { LoadingState } from "@/components/LoadingState";

export default function BusinessesLoading() {
  return (
    <main className="app-shell px-4 py-8 sm:px-6 md:px-12">
      <LoadingState
        title={{
          en: "Loading businesses...",
          ka: "ბიზნესები იტვირთება...",
        }}
        description={{
          en: "Checking verified local businesses.",
          ka: "მოწმდება დამოწმებული ადგილობრივი ბიზნესები.",
        }}
      />
    </main>
  );
}
