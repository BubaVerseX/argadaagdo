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
          className="group rounded-[1.25rem] bg-well p-5"
        >
          <summary className="cursor-pointer list-none text-base font-semibold text-cream outline-none transition hover:text-mint focus-visible:ring-2 focus-visible:ring-mint sm:text-lg">
            <span className="flex items-start justify-between gap-4">
              <span>{item.question}</span>
              <PlusIcon
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-mint transition group-open:rotate-45"
                strokeWidth={1.8}
              />
            </span>
          </summary>
          <p className="mt-4 leading-[1.55] text-body">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
