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
      className={`soft-raised flex flex-col gap-3 rounded-[1.5rem] p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm font-medium text-[#6b6152]">
        {label}: {start}-{end} of {totalItems}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="premium-button-secondary min-h-11 px-5 py-2.5"
        >
          Previous
        </button>
        <span className="soft-pressed flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold text-[#2e2a22]">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="premium-button-secondary min-h-11 px-5 py-2.5"
        >
          Next
        </button>
      </div>
    </div>
  );
}
