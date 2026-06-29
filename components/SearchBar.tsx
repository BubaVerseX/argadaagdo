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
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}
