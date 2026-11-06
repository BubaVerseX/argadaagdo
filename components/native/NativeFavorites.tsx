"use client";

import { ClockIcon, HeartIcon } from "@/components/icons";
import OfferImage from "@/components/OfferImage";
import { fetchMyFavorites } from "@/lib/favorites";
import { getOfferCategoryTone } from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupTimeRange,
  getEffectiveOfferStatus,
  getOfferDateLabel,
} from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import type { Favorite } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useState } from "react";
import Link from "./AppLink";
import NativeTopBar from "./NativeTopBar";

// Saved offers: one calm row each. Available ones open the offer; the rest
// say why they can't be reserved now. The heart removes a favourite.
export default function NativeFavorites() {
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id || null;
      if (!active) return;
      setUserId(id);
      if (!id) return;
      const loaded = await fetchMyFavorites(id);
      if (!active) return;
      setFailed(!loaded);
      setFavorites(loaded || []);
    });
    return () => {
      active = false;
    };
  }, []);

  async function remove(favorite: Favorite) {
    if (!userId) return;
    setFavorites((current) => (current || []).filter((item) => item.id !== favorite.id));
    const { error } = await supabase.from("favorites").delete().eq("id", favorite.id).eq("user_id", userId);
    if (error) setFavorites((current) => [favorite, ...(current || [])]);
  }

  function statusLabel(favorite: Favorite) {
    const status = favorite.offers ? getEffectiveOfferStatus(favorite.offers) : null;
    if (status === "active") return null;
    if (status === "sold_out") return L("გაიყიდა", "Sold out");
    if (status === "expired") return L("ვადა გავიდა", "Ended");
    return L("ახლა მიუწვდომელია", "Not available now");
  }

  return (
    <main className="native-main native-main--bare">
      <NativeTopBar title={L("რჩეულები", "Favourites")} />

      <div className="grid gap-2.5 px-5 pb-8">
        {userId === null && (
          <div className="rounded-[22px] bg-card p-5 text-center">
            <p className="text-sm text-body">{L("შედი, რომ რჩეულები ნახო.", "Sign in to see your favourites.")}</p>
            <Link
              href="/login?redirect=/favorites"
              className="native-press mt-3 flex min-h-11 items-center justify-center rounded-2xl bg-brand-forest text-sm font-semibold text-brand-ground"
            >
              {L("შესვლა", "Sign in")}
            </Link>
          </div>
        )}

        {userId && !favorites &&
          [0, 1, 2].map((key) => <div key={key} className="native-skeleton h-[4.75rem] rounded-[20px]" />)}

        {failed && (
          <p className="rounded-[20px] bg-card p-5 text-center text-sm text-body">
            {L("რჩეულები ვერ ჩაიტვირთა. სცადე ხელახლა.", "Favourites couldn't load. Please try again.")}
          </p>
        )}

        {favorites && !failed && favorites.length === 0 && (
          <div className="rounded-[22px] bg-card px-5 pb-5 pt-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss text-mint">
              <HeartIcon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-cream">{L("ჯერ არაფერი შეგინახავს", "Nothing saved yet")}</p>
            <p className="mt-0.5 text-sm text-body">{L("შეთავაზებაზე ♡ შეინახავს მას.", "Tap ♡ on an offer to save it.")}</p>
            <Link
              href="/"
              className="native-press mt-4 flex min-h-11 items-center justify-center rounded-2xl bg-brand-forest text-sm font-semibold text-brand-ground"
            >
              {L("შეთავაზებების ნახვა", "Browse offers")}
            </Link>
          </div>
        )}

        {favorites?.map((favorite) => {
          const offer = favorite.offers;
          const unavailable = statusLabel(favorite);
          const name = offer?.businesses?.name || offer?.title || L("შეთავაზება", "Offer");
          const body = (
            <>
              <div className={`${getOfferCategoryTone(offer?.category)} photo-leaf-sm relative isolate h-14 w-14 shrink-0`}>
                <OfferImage src={offer?.image_url || null} alt={name} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-cream">{name}</p>
                {unavailable || !offer ? (
                  <p className="truncate text-[13px] text-muted">{unavailable}</p>
                ) : (
                  <p className="flex min-w-0 items-center gap-1 text-[13px] text-body">
                    <ClockIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    <span className="min-w-0 truncate">
                      {getOfferDateLabel(offer, language)} {formatPickupTimeRange(offer, language)}
                    </span>
                    <span className="ml-auto shrink-0 pl-2 font-semibold text-mint">{formatMoney(offer.price)}</span>
                  </p>
                )}
              </div>
            </>
          );

          return (
            <div key={favorite.id} className={`flex items-center gap-1 rounded-[20px] bg-card p-2.5 ${unavailable ? "opacity-70" : ""}`}>
              {offer && !unavailable ? (
                <Link href={`/offers/${offer.id}`} className="native-press flex min-w-0 flex-1 items-center gap-3">
                  {body}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
              )}
              <button
                type="button"
                onClick={() => void remove(favorite)}
                aria-label={L("რჩეულებიდან წაშლა", "Remove from favourites")}
                className="native-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mint"
              >
                <HeartIcon className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={1.8} />
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
