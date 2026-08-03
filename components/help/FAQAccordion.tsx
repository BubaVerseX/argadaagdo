import { PlusIcon } from "@/components/icons";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQAccordionProps = {
  items: FAQItem[];
};

export function FAQAccordion({ items }: FAQAccordionProps) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-[1.25rem] bg-[#f4efe4] p-5"
        >
          <summary className="cursor-pointer list-none text-base font-bold text-[#2e2a22] outline-none transition hover:text-[#a67c52] focus-visible:ring-2 focus-visible:ring-[#a67c52] sm:text-lg">
            <span className="flex items-start justify-between gap-4">
              <span>{item.question}</span>
              <PlusIcon
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-[#a67c52] transition group-open:rotate-45"
                strokeWidth={1.8}
              />
            </span>
          </summary>
          <p className="mt-4 leading-[1.55] text-[#6b6152]">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
