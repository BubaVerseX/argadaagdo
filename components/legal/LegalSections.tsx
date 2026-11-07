"use client";

import { ChevronDownIcon } from "@/components/icons";
import type { ContentSection } from "@/lib/legal/shared";
import { useEffect, useState } from "react";

// Legal sections as tap-to-open rows on phones, so a long policy fits on about
// one screen; all open on wider screens. A section named in the URL hash
// (e.g. /privacy#delete-account) opens and scrolls into view.
export default function LegalSections({
  sections,
  alwaysOpen = false,
}: {
  sections: ContentSection[];
  /** Short pages (refund, pickup) show every section open on phones too. */
  alwaysOpen?: boolean;
}) {
  const [openAll, setOpenAll] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      setOpenAll(wide.matches);
      setHash(window.location.hash.slice(1));
    };
    sync();
    wide.addEventListener("change", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      wide.removeEventListener("change", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView();
  }, [hash]);

  return (
    <div className="mt-4 grid gap-2.5 md:mt-6 md:gap-4">
      {sections.map((section, index) => (
        <details
          key={`${section.title}-${openAll}-${hash}`}
          id={section.id}
          open={alwaysOpen || openAll || (Boolean(section.id) && section.id === hash)}
          className="group scroll-mt-24 rounded-2xl ui-card md:rounded-3xl"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 md:px-8 md:py-6 [&::-webkit-details-marker]:hidden">
            <span className="ui-well flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-mint md:h-12 md:w-12 md:rounded-2xl md:text-xl">
              {index + 1}
            </span>
            <h2 className="min-w-0 flex-1 break-words text-base font-semibold text-cream md:text-2xl">
              {section.title}
            </h2>
            <ChevronDownIcon
              className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
              strokeWidth={2}
            />
          </summary>
          <div className="px-4 pb-4 md:px-8 md:pb-8 md:pl-[6.5rem]">
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-2 leading-7 text-body first:mt-0 md:leading-8">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-2 grid list-disc gap-2 pl-5 leading-7 text-body marker:text-mint">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.note && <p className="mt-2 leading-7 text-body">{section.note}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}
