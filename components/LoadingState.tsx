type LoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function LoadingState({
  title = "Loading ArGadaagdo...",
  description = "Preparing your marketplace view.",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`w-full rounded-3xl bg-white p-6 text-center shadow-sm sm:rounded-[2rem] sm:p-10 ${className}`}
    >
      <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-green-100 sm:h-16 sm:w-16" />
      <h1 className="mt-5 text-2xl font-black text-gray-950 sm:text-3xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md font-semibold leading-7 text-gray-600">
        {description}
      </p>
    </div>
  );
}
