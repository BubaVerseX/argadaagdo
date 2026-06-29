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
          className="group rounded-3xl border border-gray-100 bg-[#F7F6EF] p-5"
        >
          <summary className="cursor-pointer list-none text-base font-black text-gray-950 outline-none transition hover:text-green-700 focus-visible:ring-2 focus-visible:ring-green-200 sm:text-lg">
            <span className="flex items-start justify-between gap-4">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="text-green-700 transition group-open:rotate-45"
              >
                +
              </span>
            </span>
          </summary>
          <p className="mt-4 font-semibold leading-7 text-gray-700">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
