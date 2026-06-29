import type { ReactNode } from "react";

type FilterBarProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FilterBar({
  title,
  description,
  children,
  className = "",
}: FilterBarProps) {
  return (
    <div className={`rounded-3xl bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && <p className="text-sm font-black text-gray-950">{title}</p>}
          {description && (
            <p className="mt-1 text-sm font-semibold leading-6 text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}
