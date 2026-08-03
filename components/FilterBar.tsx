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
    <div className={`soft-raised rounded-3xl p-4 sm:p-5 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && <p className="text-sm font-black text-[#2e2a22]">{title}</p>}
          {description && (
            <p className="mt-1 text-sm font-semibold leading-6 text-[#6b6152]">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}
