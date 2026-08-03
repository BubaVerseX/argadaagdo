import { SearchIcon } from "@/components/icons";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder,
  label,
  className = "",
}: SearchBarProps) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{label}</span>
      <SearchIcon
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8072]"
        strokeWidth={1.8}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="premium-input w-full py-3 pl-11 pr-4 font-semibold"
      />
    </label>
  );
}
