"use client";

import { LeafIcon } from "@/components/icons";
import type { Language } from "@/lib/i18n";
import {
  calculateImpact,
  formatImpactSentence,
  formatKg,
  renderImpactShareImage,
} from "@/lib/impact";
import { useState } from "react";

type ImpactCardProps = {
  language: Language;
  bags: number;
  subject: "you" | "store";
  /** Shown under the numbers, e.g. the store name. */
  caption?: string;
  className?: string;
};

// "You saved N bags ≈ N kg food ≈ N×2.7 kg CO₂", with a share image. Used on
// the customer profile and the business dashboard.
export function ImpactCard({ language, bags, subject, caption, className = "" }: ImpactCardProps) {
  const isGeorgian = language === "ka";
  const impact = calculateImpact(bags);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState("");

  async function share() {
    if (sharing) return;
    setSharing(true);
    setShareNote("");

    const headline = formatImpactSentence(impact, language, subject);
    const blob = await renderImpactShareImage({
      impact,
      language,
      headline,
      subline: isGeorgian
        ? "argadaagdo-silk.vercel.app · საკვების გადარჩენა თბილისში"
        : "argadaagdo-silk.vercel.app · Food rescue in Tbilisi",
    });

    if (!blob) {
      setSharing(false);
      setShareNote(isGeorgian ? "სურათი ვერ შეიქმნა." : "The image could not be created.");
      return;
    }

    const file = new File([blob], "argadaagdo-impact.png", { type: "image/png" });
    const shareData: ShareData = { files: [file], text: headline };

    try {
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
        setSharing(false);
        return;
      }
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        setSharing(false);
        return;
      }
    }

    // No system share sheet (desktop browsers): download the image instead.
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "argadaagdo-impact.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setShareNote(isGeorgian ? "სურათი ჩამოიტვირთა." : "Image downloaded.");
    setSharing(false);
  }

  return (
    <div className={`hero-surface rounded-3xl p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mint">
            {isGeorgian ? "შენი გავლენა" : "Impact"}
          </p>
          <p className="mt-2 text-lg font-semibold leading-snug text-cream sm:text-xl">
            {formatImpactSentence(impact, language, subject)}
          </p>
          {caption && <p className="mt-1 text-sm text-body">{caption}</p>}
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-well text-mint">
          <LeafIcon className="h-6 w-6" strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { value: String(impact.bags), label: isGeorgian ? "ჩანთა" : "bags" },
          { value: formatKg(impact.foodKg, language), label: isGeorgian ? "საკვები" : "food" },
          { value: formatKg(impact.co2Kg, language), label: "CO₂" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-well px-3 py-3 text-center">
            <p className="text-xl font-semibold tabular-nums text-cream sm:text-2xl">{item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-body">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void share()}
          disabled={sharing || impact.bags === 0}
          className="premium-button min-h-11 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sharing
            ? isGeorgian
              ? "მზადდება..."
              : "Preparing..."
            : isGeorgian
            ? "გავლენის გაზიარება"
            : "Share my impact"}
        </button>
        <p className="text-xs leading-5 text-body">
          {shareNote ||
            (isGeorgian
              ? "შეფასება: 1 ჩანთა ≈ 1 კგ საკვები ≈ 2.7 კგ CO₂."
              : "Estimate: 1 bag ≈ 1 kg of food ≈ 2.7 kg CO₂.")}
        </p>
      </div>
    </div>
  );
}
