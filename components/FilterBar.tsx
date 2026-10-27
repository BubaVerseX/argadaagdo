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
    <div className={`ui-card rounded-3xl p-4 sm:p-5 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && <p className="text-sm font-semibold text-cream">{title}</p>}
          {description && (
            <p className="mt-1 text-sm font-semibold leading-6 text-body">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}
