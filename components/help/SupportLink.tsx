import Link from "next/link";

type SupportLinkProps = {
  label?: string;
};

export function SupportLink({ label = "Visit Support Center" }: SupportLinkProps) {
  return (
    <Link
      href="/support"
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-center font-black text-green-800 ring-1 ring-green-100 transition hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
    >
      {label}
    </Link>
  );
}
