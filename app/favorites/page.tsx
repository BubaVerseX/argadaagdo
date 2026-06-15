"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import StatCard from "@/components/StatCard";
import {
  getConfirmedUser,
  getProfileById,
  VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE,
} from "@/lib/auth";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { createMapsSearchUrl } from "@/lib/maps";
import { formatPickupWindow, isOfferReservable } from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import type { Favorite } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [removingFavoriteId, setRemovingFavoriteId] = useState<number | null>(
    null
  );

  const loadFavorites = useCallback(
    async (userId: string) => {
      await processExpiredMarketplace();

      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          id,
          user_id,
          offer_id,
          created_at,
          offers(
            id,
            business_id,
            title,
            category,
            price,
            old_price,
            quantity,
            pickup_date,
            pickup_start,
            pickup_end,
            active,
            image_url,
            businesses(name, address, business_type)
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        setMessageTone("error");
        setMessage("Favorites could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      setFavorites((data || []) as unknown as Favorite[]);
      setLoading(false);
    },
    []
  );

  async function removeFavorite(favorite: Favorite) {
    if (!currentUserId) return;

    setRemovingFavoriteId(favorite.id);
    setMessage("");
    setFavorites((currentFavorites) =>
      currentFavorites.filter((item) => item.id !== favorite.id)
    );

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", favorite.id)
      .eq("user_id", currentUserId);

    if (error) {
      setMessageTone("error");
      setMessage("Favorite could not be removed. Please try again.");
      await loadFavorites(currentUserId);
    }

    setRemovingFavoriteId(null);
  }

  useEffect(() => {
    let active = true;

    async function initialiseFavorites() {
      const authResult = await getConfirmedUser();

      if (!active) return;

      if (authResult.status === "signed_out") {
        router.replace("/login");
        return;
      }

      if (authResult.status === "unverified") {
        setCurrentUserId(null);
        setMessageTone("warning");
        setMessage(VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE);
        setLoading(false);
        return;
      }

      const userId = authResult.user.id;
      const profile = await getProfileById(userId, 4);

      if (!active) return;

      setCurrentUserId(userId);

      if (profile?.role !== "customer") {
        setMessageTone("warning");
        setMessage("Favorites are available for customer accounts.");
        setLoading(false);
        return;
      }

      await loadFavorites(userId);
    }

    void initialiseFavorites();

    return () => {
      active = false;
    };
  }, [loadFavorites, router]);

  const availableFavorites = favorites.filter(
    (favorite) => favorite.offers && isOfferReservable(favorite.offers)
  );
  const unavailableFavorites = favorites.length - availableFavorites.length;

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-5 sm:py-8 md:px-12 md:py-14">
        <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
          <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
            Saved offers
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            Your favorite rescue boxes.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:text-lg">
            Keep interesting offers in one place and come back when you are
            ready to reserve.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
            <StatCard title="Saved" value={favorites.length} />
            <StatCard
              title="Available"
              value={availableFavorites.length}
              tone="green"
            />
            <StatCard
              title="Unavailable"
              value={unavailableFavorites}
              tone="yellow"
            />
          </div>
        </div>

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
            <p className="font-semibold text-gray-600">
              Loading your favorites...
            </p>
          </div>
        )}

        {!loading && favorites.length === 0 && !message && (
          <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              Save
            </div>

            <h2 className="mt-5 text-3xl font-black">
              No favorites saved yet
            </h2>

            <p className="mt-3 font-medium text-gray-600">
              Save offers from the marketplace and they will appear here.
            </p>

            <Link
              href="/offers"
              className="mt-6 inline-block min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white sm:py-4"
            >
              Browse Offers
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => {
            const offer = favorite.offers;
            const isAvailable = Boolean(offer && isOfferReservable(offer));
            const mapsUrl = offer
              ? createMapsSearchUrl(
                  offer.businesses?.address,
                  offer.businesses?.name
                )
              : "";

            return (
              <div
                key={favorite.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm sm:rounded-[2rem]"
              >
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-green-100 to-yellow-100 sm:h-56">
                  {offer ? (
                    <OfferImage
                      src={offer.image_url}
                      alt={offer.title}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-xl font-black text-green-800">
                      Offer unavailable
                    </div>
                  )}

                  <div
                    className={`absolute left-4 top-4 rounded-full px-4 py-2 text-sm font-black shadow-sm ${
                      isAvailable
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {isAvailable ? "Available" : "Unavailable"}
                  </div>
                </div>

                <div className="p-4 sm:p-5 md:p-6">
                  <h2 className="text-xl font-black leading-tight sm:text-2xl">
                    {offer?.title || "Offer no longer available"}
                  </h2>

                  <p className="mt-2 text-lg font-bold text-gray-800">
                    {offer?.businesses?.name || "Business unavailable"}
                  </p>

                  <div className="mt-4 grid gap-3 font-semibold text-gray-600">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        {offer?.businesses?.address ||
                          "This offer may have ended or become private."}
                      </p>

                      {offer?.businesses?.address && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open map for ${offer.businesses?.name || offer.title}`}
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 sm:w-auto"
                        >
                          Open map
                        </a>
                      )}
                    </div>

                    {offer && (
                      <p>
                        Pickup: {formatPickupWindow(offer)}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {offer && (
                        <>
                          <span className="text-4xl font-black text-green-700">
                            ₾{offer.price}
                          </span>

                          {offer.old_price && (
                            <span className="ml-3 font-bold text-gray-400 line-through">
                              ₾{offer.old_price}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => removeFavorite(favorite)}
                        disabled={removingFavoriteId !== null}
                        aria-label={`Remove ${offer?.title || "offer"} from favorites`}
                        className="min-h-12 rounded-full border border-red-200 bg-red-50 px-5 py-3 font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingFavoriteId === favorite.id
                          ? "Removing..."
                          : "❤️ Remove Favorite"}
                      </button>

                      {isAvailable && offer && (
                        <Link
                          href={`/checkout/${offer.id}`}
                          className="min-h-12 rounded-full bg-green-700 px-5 py-3 text-center font-black text-white transition hover:bg-green-800"
                        >
                          Continue to checkout
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
