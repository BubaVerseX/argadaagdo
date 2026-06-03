"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { notifyReservationConfirmed } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CheckoutOffer = Offer & {
  businesses?: {
    name: string;
    address: string;
    business_type: string;
  } | null;
};

type CheckoutOfferResult =
  | { status: "success"; offer: CheckoutOffer }
  | { status: "error" | "warning"; message: string };

async function fetchCheckoutOffer(
  offerId: number,
): Promise<CheckoutOfferResult> {
  if (!Number.isFinite(offerId) || offerId <= 0) {
    return {
      status: "error",
      message: "This checkout link is not valid.",
    };
  }

  const { data, error } = await supabase
    .from("offers")
    .select("*, businesses(name, address, business_type)")
    .eq("id", offerId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: "Checkout could not be loaded. Please try again.",
    };
  }

  if (!data) {
    return {
      status: "warning",
      message: "This offer is no longer available for checkout.",
    };
  }

  return { status: "success", offer: data as CheckoutOffer };
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const offerId = useMemo(() => Number(params.id), [params.id]);

  const [offer, setOffer] = useState<CheckoutOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");

  useEffect(() => {
    let isCurrent = true;

    async function loadInitialOffer() {
      const result = await fetchCheckoutOffer(offerId);

      if (!isCurrent) return;

      if (result.status === "success") {
        setOffer(result.offer);
        setLoading(false);
        return;
      }

      setOffer(null);
      setMessageTone(result.status);
      setMessage(result.message);
      setLoading(false);
    }

    void loadInitialOffer();

    return () => {
      isCurrent = false;
    };
  }, [offerId]);

  async function refreshOffer() {
    const result = await fetchCheckoutOffer(offerId);

    if (result.status === "success") {
      setOffer(result.offer);
    }
  }

  async function confirmMockPayment() {
    setMessage("");

    if (!offer) return;

    if (Number(offer.quantity || 0) <= 0) {
      setMessageTone("warning");
      setMessage("This offer has sold out.");
      await refreshOffer();
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setPaying(true);

    const { error } = await supabase.rpc("mock_pay_and_reserve_offer", {
      p_offer_id: offer.id,
    });

    if (error) {
      setMessageTone("error");
      setMessage(error.message || "Mock payment could not be completed.");
      setPaying(false);
      await refreshOffer();
      return;
    }

    notifyReservationConfirmed({
      offerId: offer.id,
      offerTitle: offer.title,
      businessName: offer.businesses?.name,
      pickupStart: offer.pickup_start,
      pickupEnd: offer.pickup_end,
    });

    setMessageTone("success");
    setMessage("Payment confirmed. Your pickup code is in Orders.");
    router.push("/orders");
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:p-8 md:rounded-[2.5rem] md:p-10">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              Secure mock checkout
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              Confirm your rescue box.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:text-lg">
              This demo uses the new payment-first flow. The order is created
              only after mock payment succeeds.
            </p>
          </div>

          {message && (
            <div className="mt-5 sm:mt-6">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}

          {loading && (
            <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
              <p className="font-semibold text-gray-600">
                Loading checkout...
              </p>
            </div>
          )}

          {!loading && offer && (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm sm:rounded-[2rem]">
                <div className="relative h-64 bg-gradient-to-br from-green-100 to-yellow-100 sm:h-80">
                  <OfferImage
                    src={offer.image_url}
                    alt={offer.title}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                </div>

                <div className="p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-green-700">
                        {offer.businesses?.business_type || "Food"}
                      </p>
                      <h2 className="mt-2 text-3xl font-black">
                        {offer.title}
                      </h2>
                      <p className="mt-2 text-lg font-bold text-gray-800">
                        {offer.businesses?.name || "Business unavailable"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-green-50 px-5 py-4 text-center">
                      <p className="text-xs font-black text-green-700">
                        LEFT
                      </p>
                      <p className="text-3xl font-black text-green-800">
                        {offer.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 font-semibold text-gray-700">
                    <p>Pickup: {offer.pickup_start} - {offer.pickup_end}</p>
                    <p>
                      Address:{" "}
                      {offer.businesses?.address || "Address unavailable"}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
                <h2 className="text-2xl font-black">Payment summary</h2>

                <div className="mt-6 grid gap-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-semibold text-gray-600">
                      Rescue box
                    </span>
                    <span className="text-3xl font-black text-green-700">
                      ₾{offer.price}
                    </span>
                  </div>

                  {offer.old_price && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-600">
                        Regular price
                      </span>
                      <span className="font-black text-gray-400 line-through">
                        ₾{offer.old_price}
                      </span>
                    </div>
                  )}

                  <div className="rounded-2xl bg-[#F7F6EF] p-4">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">
                      Provider
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      Mock online payment
                    </p>
                  </div>
                </div>

                <button
                  onClick={confirmMockPayment}
                  disabled={paying || Number(offer.quantity || 0) <= 0}
                  className="mt-6 min-h-12 w-full rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paying
                    ? "Processing..."
                    : Number(offer.quantity || 0) <= 0
                    ? "Sold out"
                    : "Confirm mock payment"}
                </button>

                <Link
                  href="/offers"
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-50 px-6 py-3 font-black text-green-700 transition hover:bg-green-100"
                >
                  Back to offers
                </Link>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
