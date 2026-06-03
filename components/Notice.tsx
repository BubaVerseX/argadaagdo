type NoticeTone = "success" | "error" | "warning";

const styles: Record<NoticeTone, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
};

type NoticeProps = {
  children: React.ReactNode;
  tone?: NoticeTone;
};

export default function Notice({
  children,
  tone = "success",
}: NoticeProps) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm font-semibold sm:text-base ${styles[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
