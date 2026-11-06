"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeHomeScreen } from "@/components/native/screens";
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

function Home() {
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
      ? "გადაარჩინე კარგი საკვები თბილისის ადგილობრივი ბიზნესებიდან."
      : "Rescue great food from local Tbilisi businesses.",
    heroSubtitle: isGeorgian
      ? "არ გადააგდო აკავშირებს მომხმარებლებს კაფეებთან, საცხობებთან და რესტორნებთან, რომლებსაც დღის ბოლოს დარჩენილი კარგი საკვები აქვთ."
      : "ArGadaagdo connects customers with cafes, bakeries and restaurants that have good food left at the end of the day.",
    categoriesLabel: isGeorgian ? "პოპულარული კატეგორიები" : "Popular categories",
    browseToday: isGeorgian ? "აღმოჩენა" : "Discover",
    listSurplus: isGeorgian ? "განათავსე ჭარბი საკვები" : "List your surplus",
    localLabel: isGeorgian ? "თბილისის პილოტი" : "Tbilisi pilot",
    discoverTitle: isGeorgian ? "აღმოაჩინე" : "Discover",
    discoverText: isGeorgian
      ? "დაათვალიერე თბილისის ბიზნესების ლანჩ ბოქსები, სანამ გაქრება."
      : "Spot Lunch Boxes from Tbilisi businesses before they're gone.",
    reserveTitle: isGeorgian ? "დაჯავშნე" : "Reserve",
    reserveText: isGeorgian
      ? "გადაიხადე უსაფრთხოდ ერთი შეხებით და მაშინვე მიიღე წაღების კოდი."
      : "Pay securely in a tap and get your pickup code instantly.",
    collectTitle: isGeorgian ? "წაიღე" : "Collect",
    collectText: isGeorgian
      ? "ეწვიე მითითებულ დროს, აჩვენე კოდი და ისიამოვნე საკვებით."
      : "Swing by during the pickup window, show your code, and dig in.",
    howItWorksBadge: isGeorgian ? "როგორ მუშაობს" : "How it works",
    howItWorksTitle: isGeorgian
      ? "სამი ნაბიჯი შენს შემდეგ საუკეთესო შეთავაზებამდე."
      : "Three steps to your next great deal.",
    launchBadge: isGeorgian
      ? "🇬🇪 უკვე ხელმისაწვდომია თბილისში"
      : "🇬🇪 Now live in Tbilisi",
    heroAccentPhrase: isGeorgian ? "კარგი საკვები" : "great food",
    reserveLabel: isGeorgian ? "დაჯავშნე" : "Reserve",
    statsBadge: isGeorgian ? "გავლენა" : "Our impact",
    businessLearnMore: isGeorgian ? "გაიგე, როგორ მუშაობს" : "See how it works",
    finalCtaBadge: isGeorgian ? "მზად ხარ, როცა მოისურვებ" : "Ready when you are",
    finalCtaTitle: isGeorgian
      ? "შენი შემდეგი გემრიელი კერძი უკვე გელოდება."
      : "Your next great meal is already waiting.",
    finalCtaText: isGeorgian
      ? "იპოვე ლანჩ ბოქსები შენთან ახლოს, ან განათავსე ჭარბი საკვები და აქციე ის შემოსავლად."
      : "Find Lunch Boxes near you, or list your surplus and turn it into revenue.",
    finalCtaSecondary: isGeorgian ? "დაამატე შენი ბიზნესი" : "List your business",
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
  const stats = [
    {
      label: isGeorgian ? "მხოლოდ ადგილზე წაღება" : "Pickup-only, always",
      text: isGeorgian
        ? "არანაირი მიწოდების შეფუთვა და ზედმეტი ემისია — მხოლოდ საკვები, რომელსაც გადაყრის ნაცვლად ჭამენ."
        : "No delivery packaging, no extra emissions — just food that gets eaten instead of thrown away.",
    },
    {
      label: t("forBusinesses.commissionTitle"),
      text: t("forBusinesses.commissionText"),
    },
    {
      value: isGeorgian ? "თბილისი" : "Tbilisi",
      label: isGeorgian ? "საიდანაც ვიწყებთ" : "Where we're starting",
      text: isGeorgian
        ? "ყველა ბიზნესი ხელით მოწმდება გამოქვეყნებამდე — ვიწყებთ ერთი ქალაქიდან, გააზრებულად."
        : "Every business is reviewed by hand before going live — starting local, on purpose.",
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
  const businessSolutions = [
    {
      title: t("forBusinesses.solutionListTitle"),
      text: t("forBusinesses.solutionListText"),
    },
    {
      title: t("forBusinesses.solutionReachTitle"),
      text: t("forBusinesses.solutionReachText"),
    },
    {
      title: t("forBusinesses.solutionRecoverTitle"),
      text: t("forBusinesses.solutionRecoverText"),
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
      stats,
      steps,
      businessSolutions,
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

export default withNativeScreen(Home, NativeHomeScreen);
