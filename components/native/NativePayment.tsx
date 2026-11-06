"use client";

import { ChevronRightIcon, LockIcon, ReceiptIcon, TagIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";
import Link from "./AppLink";
import NativeTopBar from "./NativeTopBar";

// How paying works. Every point matches the payment code: TBC Bank card
// payments only (lib/payments/tbc.ts), no card storage, no extra fee, and a
// full refund for cancelling up to 2 hours before pickup (begin_customer_refund).
export default function NativePayment() {
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);

  const points = [
    {
      Icon: LockIcon,
      title: L("ბარათით, TBC ბანკის გვერდზე", "By card, on TBC Bank's page"),
      body: L(
        "გადახდისას გადახვალ TBC ბანკის დაცულ გვერდზე. ბარათის მონაცემებს ჩვენ ვერ ვხედავთ და არ ვინახავთ.",
        "At checkout you pay on TBC Bank's secure page. We never see or store your card details."
      ),
    },
    {
      Icon: TagIcon,
      title: L("ფასი, რასაც ხედავ", "The price you see"),
      body: L(
        "იხდი მხოლოდ ბოქსის ფასს — დამატებითი საკომისიოს გარეშე.",
        "You pay the box price only, with no extra fee."
      ),
    },
    {
      Icon: ReceiptIcon,
      title: L("გაუქმება და თანხის დაბრუნება", "Cancelling and refunds"),
      body: L(
        "წაღების დაწყებამდე 2 საათით ადრე შეგიძლია გააუქმო და თანხა სრულად დაგიბრუნდება იმავე ბარათზე. ჩარიცხვის დრო ბანკზეა დამოკიდებული.",
        "Cancel up to 2 hours before pickup starts for a full refund to the same card. How fast it arrives depends on your bank."
      ),
    },
  ];

  return (
    <main className="native-main native-main--bare">
      <NativeTopBar title={L("გადახდა", "Payment")} />

      <div className="grid gap-3 px-5 pb-8">
        <ul className="overflow-hidden rounded-[24px] bg-card">
          {points.map(({ Icon, title, body }, index) => (
            <li key={title} className={`flex gap-3 p-4 ${index > 0 ? "border-t border-line" : ""}`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sage" strokeWidth={1.8} />
              <div>
                <p className="font-bold text-cream">{title}</p>
                <p className="mt-1 text-sm leading-6 text-body">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href="/orders"
          className="native-press flex min-h-14 items-center gap-3 rounded-[24px] bg-card px-4 font-medium text-cream"
        >
          <ReceiptIcon className="h-5 w-5 shrink-0 text-sage" strokeWidth={1.8} />
          <span className="flex-1">{L("გადახდების ისტორია — ჩემი შეკვეთები", "Payment history — My orders")}</span>
          <ChevronRightIcon className="h-4 w-4 text-muted" strokeWidth={2} />
        </Link>
      </div>
    </main>
  );
}
