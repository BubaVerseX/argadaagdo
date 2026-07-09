import Link from "next/link";

type SupportLinkProps = {
  label?: string;
};

export function SupportLink({ label = "Visit Support Center" }: SupportLinkProps) {
  return (
    <Link
      href="/support"
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-center font-semibold text-[#5c7a5c] shadow-[var(--shadow-soft)] transition hover:bg-[#ece7da] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
    >
      {label}
    </Link>
  );
}
