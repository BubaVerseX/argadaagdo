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
          className="group rounded-[1.25rem] bg-[#ece7da] p-5"
        >
          <summary className="cursor-pointer list-none text-base font-bold text-[#1a1815] outline-none transition hover:text-[#5c7a5c] focus-visible:ring-2 focus-visible:ring-[#5c7a5c] sm:text-lg">
            <span className="flex items-start justify-between gap-4">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="text-[#5c7a5c] transition group-open:rotate-45"
              >
                +
              </span>
            </span>
          </summary>
          <p className="mt-4 leading-[1.55] text-[#6b6558]">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
