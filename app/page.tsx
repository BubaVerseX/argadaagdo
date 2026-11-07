"use client";

import AccountDeletedNotice from "@/components/AccountDeletedNotice";
import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeHomeScreen } from "@/components/native/screens";
import { AppHome } from "@/components/home/AppHome";
import { PublicHome } from "@/components/home/PublicHome";
import { getUserErrorMessage } from "@/lib/errors";
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
        // Tidies expired offers in the background; the read below does not wait.
        void processExpiredMarketplace();

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

  const homeProps = {
    language,
    t,
    title: t("offers.title"),
    offers,
    ratingSummaries,
    loading,
    errorMessage,
  };

  return (
    <>
      <AccountDeletedNotice />
      {signedIn ? <AppHome {...homeProps} /> : <PublicHome {...homeProps} />}
    </>
  );
}

export default withNativeScreen(Home, NativeHomeScreen);
