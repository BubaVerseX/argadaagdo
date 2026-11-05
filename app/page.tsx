"use client";

import { AppHome } from "@/components/home/AppHome";
import { PublicHome } from "@/components/home/PublicHome";
import { getUserErrorMessage } from "@/lib/errors";
import { OFFER_CATEGORIES } from "@/lib/offerCategories";
import { useHasStoredSession } from "@/lib/useHasStoredSession";
import { useLanguage } from "@/lib/useLanguage";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  compareMarketplaceOffers,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { useEffect, useState } from "react";

export default function Home() {
  const { language, t } = useLanguage();
  const signedIn = useHasStoredSession();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFeaturedOffers() {
      try {
        await processExpiredMarketplace();

        const [{ data, error }, summaries] = await Promise.all([
          supabase
            .from("offers")
            .select("*, businesses(name, address, business_type)")
            .eq("active", true)
            .eq("status", "active")
            .gt("quantity", 0)
            .order("id", { ascending: false })
            .limit(6),
          loadBusinessRatingSummaries(),
        ]);

        if (!active) return;

        if (error) {
          setErrorMessage(
            getUserErrorMessage(
              error,
              "Featured offers could not be loaded right now."
            )
          );
          setOffers([]);
          setLoading(false);
          return;
        }

        setErrorMessage("");
        setRatingSummaries(summaries);
        setOffers(
          ((data || []) as Offer[]).sort((firstOffer, secondOffer) =>
            compareMarketplaceOffers(firstOffer, secondOffer, summaries)
          )
        );
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          getUserErrorMessage(
            error,
            "Featured offers could not be loaded right now."
          )
        );
        setOffers([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFeaturedOffers();

    return () => {
      active = false;
    };
  }, []);

  // Clears the pre-paint hint from app/layout.tsx when no session remains.
  useEffect(() => {
    document.documentElement.classList.toggle("has-session", signedIn);
  }, [signedIn]);

  const isGeorgian = language === "ka";
  const featuredOffers = offers.slice(0, 3);
  const categoryLinks: string[] = [...OFFER_CATEGORIES];
  const homepageCopy = {
    heroTitle: isGeorgian
      ? "გადაარჩინე კარგი საკვები თბილისში."
      : "Rescue great food in Tbilisi.",
    heroSubtitle: isGeorgian
      ? "დღის ბოლოს დარჩენილი საკვები, ფასდაკლებით."
      : "End-of-day food from local shops, at a discount.",
    categoriesLabel: isGeorgian ? "პოპულარული კატეგორიები" : "Popular categories",
    browseToday: isGeorgian ? "აღმოჩენა" : "Discover",
    localLabel: isGeorgian ? "თბილისის პილოტი" : "Tbilisi pilot",
    discoverTitle: isGeorgian ? "აღმოაჩინე" : "Discover",
    discoverText: isGeorgian
      ? "ლანჩ ბოქსები შენთან ახლოს."
      : "Lunch Boxes near you.",
    reserveTitle: isGeorgian ? "დაჯავშნე" : "Reserve",
    reserveText: isGeorgian
      ? "გადაიხადე და მიიღე კოდი."
      : "Pay and get your pickup code.",
    collectTitle: isGeorgian ? "წაიღე" : "Collect",
    collectText: isGeorgian
      ? "მოდი დროულად და აჩვენე კოდი."
      : "Come on time and show your code.",
    howItWorksBadge: isGeorgian ? "როგორ მუშაობს" : "How it works",
    howItWorksTitle: isGeorgian
      ? "სამი მარტივი ნაბიჯი."
      : "Three simple steps.",
    launchBadge: isGeorgian
      ? "🇬🇪 უკვე ხელმისაწვდომია თბილისში"
      : "🇬🇪 Now live in Tbilisi",
    heroAccentPhrase: isGeorgian ? "კარგი საკვები" : "great food",
    reserveLabel: isGeorgian ? "დაჯავშნე" : "Reserve",
    whyTitle: isGeorgian ? "რატომ არის ეს მნიშვნელოვანი" : "Why it matters",
    missionLink: isGeorgian ? "ჩვენი მისია →" : "Our mission →",
    missionLine: isGeorgian
      ? "ერთი ლანჩ ბოქსი ≈1 კგ საკვებს გადაარჩენს (შიდა შეფასება)."
      : "One bag rescues ≈1 kg of food (internal estimate).",
    finalCtaBadge: isGeorgian ? "მზად ხარ, როცა მოისურვებ" : "Ready when you are",
    finalCtaTitle: isGeorgian
      ? "შენი შემდეგი კერძი გელოდება."
      : "Your next meal is waiting.",
    finalCtaText: isGeorgian
      ? "დაჯავშნე ლანჩ ბოქსი შენთან ახლოს."
      : "Reserve a Lunch Box near you.",
  };
  const marqueeItems = isGeorgian
    ? [
        "დადასტურებული თბილისური ბიზნესები",
        "მხოლოდ ადგილზე წაღება",
        "დაცული ჯავშნები",
        "ყოველდღიური ახალი შეთავაზებები",
      ]
    : [
        "Verified Tbilisi businesses",
        "Pickup-only, zero delivery waste",
        "Secure code-based reservations",
        "Fresh Lunch Boxes daily",
      ];
  const whyStats = [
    {
      value: isGeorgian ? "1.05 მლრდ ტონა" : "1.05 bn tonnes",
      label: isGeorgian ? "გადაიყარა მსოფლიოში, 2022" : "wasted worldwide, 2022",
    },
    {
      value: isGeorgian ? "101 კგ" : "101 kg",
      label: isGeorgian
        ? "ერთ ადამიანზე / წელიწადში საქართველოში, შინამეურნეობები"
        : "per person / year in Georgia, households",
    },
    {
      value: isGeorgian ? "≈1 კგ" : "≈1 kg",
      label: isGeorgian
        ? "ერთი ლანჩ ბოქსი გადაარჩენს (შიდა შეფასება)"
        : "rescued by one bag (internal estimate)",
    },
  ];
  const steps = [
    {
      label: "01",
      title: homepageCopy.discoverTitle,
      text: homepageCopy.discoverText,
    },
    {
      label: "02",
      title: homepageCopy.reserveTitle,
      text: homepageCopy.reserveText,
    },
    {
      label: "03",
      title: homepageCopy.collectTitle,
      text: homepageCopy.collectText,
    },
  ];

  const [heroTitleBefore, heroTitleAfter] = homepageCopy.heroTitle.includes(
    homepageCopy.heroAccentPhrase
  )
    ? homepageCopy.heroTitle.split(homepageCopy.heroAccentPhrase)
    : [homepageCopy.heroTitle, ""];

  const homeProps = {
    language,
    t,
    content: {
      copy: {
        ...homepageCopy,
        heroBefore: heroTitleBefore,
        heroAccent: homepageCopy.heroTitle.includes(homepageCopy.heroAccentPhrase)
          ? homepageCopy.heroAccentPhrase
          : "",
        heroAfter: heroTitleAfter,
      },
      categoryLinks,
      whyStats,
      steps,
      marqueeItems,
    },
    offers,
    featuredOffers,
    ratingSummaries,
    loading,
    errorMessage,
  };

  return signedIn ? <AppHome {...homeProps} /> : <PublicHome {...homeProps} />;
}
