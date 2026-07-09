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
        className="premium-input w-full px-4 py-3 font-semibold"
      />
    </label>
  );
}
