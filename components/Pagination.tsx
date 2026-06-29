type PaginationProps = {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
};

export function Pagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  label = "Results",
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <div
      className={`flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm font-bold text-gray-600">
        {label}: {start}-{end} of {totalItems}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="min-h-11 rounded-full border border-green-200 bg-green-50 px-5 py-2.5 font-black text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="flex min-h-11 items-center rounded-full bg-[#F7F6EF] px-4 py-2 text-sm font-black text-gray-700">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="min-h-11 rounded-full border border-green-200 bg-green-50 px-5 py-2.5 font-black text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
