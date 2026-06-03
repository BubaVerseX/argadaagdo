"use client";

import AnalyticsBarCard from "@/components/AnalyticsBarCard";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { getProfileById } from "@/lib/auth";
import { notifyPickupCompleted } from "@/lib/notifications";
import {
  getOrderStatusClassName,
  getOrderStatusLabel,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { Business, Offer, Order } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function createImageFileName(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${crypto.randomUUID()}-${safeName}`;
}

const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];

function getPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [approvedBusinesses, setApprovedBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ownedBusinessIds, setOwnedBusinessIds] = useState<number[]>([]);
  const [ownedOfferIds, setOwnedOfferIds] = useState<number[]>([]);

  const [businessId, setBusinessId] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pickupCode, setPickupCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [publishing, setPublishing] = useState(false);
  const [updatingOfferId, setUpdatingOfferId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDashboard = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const profile = await getProfileById(userData.user.id, 4);
    const canUseBusinessTools =
      profile?.role === "business" || profile?.role === "admin";

    const { data: myBusinesses, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userData.user.id)
      .order("id", { ascending: false });

    if (businessError) {
      setMessageTone("error");
      setMessage("Your business information could not be loaded.");
      setLoading(false);
      return;
    }

    const allBusinesses = (myBusinesses || []) as Business[];
    const approved = allBusinesses.filter((business) => business.approved);

    if (!canUseBusinessTools && allBusinesses.length === 0) {
      router.replace("/business/register");
      return;
    }

    setApprovedBusinesses(approved);

    setBusinessId((currentBusinessId) => {
      if (
        currentBusinessId &&
        approved.some((business) => String(business.id) === currentBusinessId)
      ) {
        return currentBusinessId;
      }

      return approved[0] ? String(approved[0].id) : "";
    });

    const businessIds = allBusinesses.map((business) => business.id);
    setOwnedBusinessIds(businessIds);

    if (businessIds.length === 0) {
      setOffers([]);
      setOrders([]);
      setOwnedOfferIds([]);
      setLoading(false);
      return;
    }

    const { data: myOffers, error: offerError } = await supabase
      .from("offers")
      .select("*, businesses(name)")
      .in("business_id", businessIds)
      .order("id", { ascending: false });

    if (offerError) {
      setMessageTone("error");
      setMessage("Your offers could not be loaded.");
      setLoading(false);
      return;
    }

    const currentOffers = (myOffers || []) as Offer[];
    setOffers(currentOffers);

    const offerIds = currentOffers.map((offer) => offer.id);
    setOwnedOfferIds(offerIds);

    if (offerIds.length > 0) {
      const { data: myOrders, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          offers(title, price),
          profiles(email)
        `)
        .in("offer_id", offerIds)
        .order("id", { ascending: false });

      if (orderError) {
        setMessageTone("error");
        setMessage("Reservations could not be loaded.");
        setLoading(false);
        return;
      }

      setOrders((myOrders || []) as Order[]);
    } else {
      setOrders([]);
    }

    setLoading(false);
  }, [router]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void loadDashboard(), 150);
  }, [loadDashboard]);

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return "";

    if (imageFile.size > 5 * 1024 * 1024) {
      setMessageTone("error");
      setMessage("Image must be smaller than 5 MB.");
      return null;
    }

    if (!allowedImageTypes.includes(imageFile.type)) {
      setMessageTone("error");
      setMessage("Image must be a PNG, JPG, or WebP file.");
      return null;
    }

    const fileName = createImageFileName(imageFile);

    const { error } = await supabase.storage
      .from("offer-images")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setMessageTone("error");
      setMessage(`Image upload failed: ${error.message}`);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("offer-images").getPublicUrl(fileName);

    return publicUrl;
  }

  async function createOffer() {
    setMessage("");
    setMessageTone("error");

    if (!businessId) {
      setMessage("No approved business found.");
      return;
    }

    if (!title.trim()) {
      setMessage("Offer title required.");
      return;
    }

    const selectedBusinessId = Number(businessId);
    const priceValue = Number(price);
    const oldPriceValue = oldPrice ? Number(oldPrice) : null;
    const quantityValue = Number(quantity);

    if (
      !approvedBusinesses.some((business) => business.id === selectedBusinessId)
    ) {
      setMessage("Choose an approved business before publishing.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setMessage("Price must be greater than 0.");
      return;
    }

    if (
      oldPriceValue !== null &&
      (!Number.isFinite(oldPriceValue) || oldPriceValue <= 0)
    ) {
      setMessage("Old price must be greater than 0.");
      return;
    }

    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      setMessage("Quantity must be greater than 0.");
      return;
    }

    if (!pickupStart || !pickupEnd) {
      setMessage("Pickup time required.");
      return;
    }

    setPublishing(true);
    setMessageTone("success");
    setMessage("Publishing offer...");

    const imageUrl = await uploadImage();

    if (imageUrl === null) {
      setPublishing(false);
      return;
    }

    const { error } = await supabase.from("offers").insert({
      business_id: selectedBusinessId,
      title: title.trim(),
      price: priceValue,
      old_price: oldPriceValue,
      quantity: quantityValue,
      pickup_start: pickupStart,
      pickup_end: pickupEnd,
      category: "Food",
      active: true,
      image_url: imageUrl,
    });

    if (error) {
      setPublishing(false);
      setMessageTone("error");
      setMessage(
        error.message.includes("row-level security")
          ? "Offer creation was blocked by security rules. Please make sure this business is approved."
          : error.message
      );
      return;
    }

    setTitle("");
    setPrice("");
    setOldPrice("");
    setQuantity("1");
    setPickupStart("");
    setPickupEnd("");
    setImageFile(null);

    setPublishing(false);
    setMessageTone("success");
    setMessage("Offer published.");
    await loadDashboard();
  }

  async function deactivateOffer(offerId: number) {
    setUpdatingOfferId(offerId);

    const { data, error } = await supabase
      .from("offers")
      .update({ active: false })
      .eq("id", offerId)
      .eq("active", true)
      .select("id")
      .maybeSingle();

    if (error) {
      setUpdatingOfferId(null);
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    if (!data) {
      setUpdatingOfferId(null);
      setMessageTone("warning");
      setMessage("This offer was already inactive.");
      await loadDashboard();
      return;
    }

    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
        offer.id === offerId ? { ...offer, active: false } : offer
      )
    );
    setUpdatingOfferId(null);
    setMessageTone("success");
    setMessage("Offer deactivated.");
    await loadDashboard();
  }

  async function completeOrder(orderId: number, pickupCodeValue: string) {
    const completedOrder = orders.find((order) => order.id === orderId);

    if (!pickupCodeValue.trim()) {
      setMessageTone("error");
      setMessage("Pickup code required to complete an order.");
      return false;
    }

    setUpdatingOrderId(orderId);
    const { error } = await supabase.rpc("complete_pickup", {
      p_order_id: orderId,
      p_pickup_code: pickupCodeValue.trim(),
    });

    if (error) {
      setUpdatingOrderId(null);
      setMessageTone("error");
      setMessage(error.message);
      return false;
    }

    setUpdatingOrderId(null);
    setMessageTone("success");
    setMessage("Order completed.");
    notifyPickupCompleted({
      orderId,
      offerTitle: completedOrder?.offers?.title,
      businessName: completedOrder?.offers?.businesses?.name,
    });
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: "completed" } : order
      )
    );
    await loadDashboard();
    return true;
  }

  async function verifyPickupCode() {
    setMessage("");

    if (!pickupCode.trim()) {
      setMessageTone("error");
      setMessage("Enter pickup code.");
      return;
    }

    const order = orders.find(
      (item) =>
        item.pickup_code === pickupCode.trim() &&
        isConfirmedOrderStatus(item.status)
    );

    if (!order) {
      setMessageTone("error");
      setMessage("Invalid pickup code or order already completed.");
      return;
    }

    const completed = await completeOrder(order.id, pickupCode.trim());
    if (completed) setPickupCode("");
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadDashboard]);

  const businessFilter = ownedBusinessIds.join(",");
  const offerFilter = ownedOfferIds.join(",");

  useEffect(() => {
    if (!businessFilter) return;

    let channel = supabase
      .channel(`business-dashboard-offers-${businessFilter}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "offers",
          filter: `business_id=in.(${businessFilter})`,
        },
        scheduleRefresh
      );

    if (offerFilter) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `offer_id=in.(${offerFilter})`,
        },
        scheduleRefresh
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [businessFilter, offerFilter, scheduleRefresh]);

  const activeOffers = offers.filter((offer) => offer.active);
  const completedOrders = orders.filter((order) => order.status === "completed");
  const reservedOrders = orders.filter((order) =>
    isConfirmedOrderStatus(order.status)
  );
  const cancelledOrders = orders.filter(
    (order) => order.status === "cancelled" || order.status === "refunded"
  );
  const businessAnalytics = [
    {
      title: "Reservations",
      value: reservedOrders.length,
      caption: `${reservedOrders.length} active of ${orders.length} total reservations`,
      percentage: getPercentage(reservedOrders.length, orders.length),
      tone: "yellow" as const,
    },
    {
      title: "Completed pickups",
      value: completedOrders.length,
      caption: `${completedOrders.length} completed of ${orders.length} total reservations`,
      percentage: getPercentage(completedOrders.length, orders.length),
      tone: "green" as const,
    },
    {
      title: "Cancelled orders",
      value: cancelledOrders.length,
      caption: `${cancelledOrders.length} cancelled of ${orders.length} total reservations`,
      percentage: getPercentage(cancelledOrders.length, orders.length),
      tone: "red" as const,
    },
    {
      title: "Active offers",
      value: activeOffers.length,
      caption: `${activeOffers.length} public of ${offers.length} total offers`,
      percentage: getPercentage(activeOffers.length, offers.length),
      tone: "green" as const,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F6EF]">
        <Navbar />
        <section className="px-4 py-8 sm:px-6 md:px-12">
          <div className="h-60 animate-pulse rounded-3xl bg-white" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:p-8 md:rounded-[2.5rem] md:p-12">
          <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
            Business control center
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            Manage offers and pickups.
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-semibold text-green-50 sm:mt-4 sm:text-lg">
            Publish rescue boxes, track reservations, and verify pickup codes
            when customers arrive.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">Active Offers</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{activeOffers.length}</h2>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">Reserved</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{reservedOrders.length}</h2>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">Completed Pickups</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{completedOrders.length}</h2>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 sm:rounded-3xl sm:p-5">
              <p className="text-sm font-black text-green-100">Cancelled Orders</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{cancelledOrders.length}</h2>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-5 sm:mt-6">
            <Notice tone={messageTone}>{message}</Notice>
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                Pickup performance
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Analytics snapshot
              </h2>
            </div>

            <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
              A quick view of reservations, completed pickups, cancellations,
              and active offers for your approved businesses.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {businessAnalytics.map((metric) => (
              <AnalyticsBarCard key={metric.title} {...metric} />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <h2 className="text-2xl font-black sm:text-3xl">Verify pickup code</h2>

          <p className="mt-2 font-semibold text-gray-600">
            Ask customer for the 6-digit pickup code from their Orders page.
          </p>

          <div className="mt-6 flex flex-col gap-4 md:flex-row">
            <input
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value)}
              placeholder="Enter pickup code"
              inputMode="numeric"
              maxLength={6}
              className="min-h-12 w-full rounded-2xl border bg-white p-3 font-mono text-xl font-black tracking-widest outline-none sm:p-4 md:max-w-sm"
            />

            <button
              onClick={verifyPickupCode}
              disabled={updatingOrderId !== null}
              className="min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
            >
              {updatingOrderId !== null ? "Completing..." : "Verify pickup"}
            </button>
          </div>
        </div>

        {approvedBusinesses.length === 0 && (
          <div className="mt-6 rounded-3xl bg-yellow-100 p-5 sm:mt-8 sm:p-8">
            <h2 className="text-xl font-black text-yellow-800 sm:text-2xl">
              Waiting for approval
            </h2>
            <p className="mt-3 font-medium text-yellow-700">
              Your business must be approved before publishing offers.
            </p>
          </div>
        )}

        {approvedBusinesses.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
            <h2 className="text-2xl font-black sm:text-3xl">Create offer</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <select
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="rounded-2xl border p-4 font-semibold"
              >
                {approvedBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Offer title"
              />

              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Price"
              />

              <input
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Old price"
              />

              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Quantity"
              />

              <input
                value={pickupStart}
                onChange={(e) => setPickupStart(e.target.value)}
                type="time"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Pickup start"
              />

              <input
                value={pickupEnd}
                onChange={(e) => setPickupEnd(e.target.value)}
                type="time"
                className="rounded-2xl border p-4 font-semibold"
                placeholder="Pickup end"
              />

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="rounded-2xl border bg-white p-4 font-semibold"
              />
            </div>

            <button
              onClick={createOffer}
              disabled={publishing}
              className="mt-6 min-h-12 w-full rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-4"
            >
              {publishing ? "Publishing..." : "Publish offer"}
            </button>
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <h2 className="text-2xl font-black sm:text-3xl">My offers</h2>

          <div className="mt-6 grid gap-4">
            {offers.length === 0 && (
              <p className="font-medium text-gray-600">No offers created yet.</p>
            )}

            {offers.map((offer) => {
              const statusLabel = offer.active
                ? "Active"
                : offer.quantity <= 0
                ? "Sold out"
                : "Inactive";
              const statusClass = offer.active
                ? "bg-green-100 text-green-700"
                : offer.quantity <= 0
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-700";

              return (
                <div
                  key={offer.id}
                  className="flex flex-col gap-4 rounded-2xl border p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24 sm:rounded-2xl">
                      <OfferImage
                        src={offer.image_url}
                        alt={offer.title}
                        sizes="96px"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black">{offer.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <p className="font-medium text-gray-700">
                        ₾{offer.price} · Quantity: {offer.quantity}
                      </p>
                      <p className="text-gray-600">
                        Pickup: {offer.pickup_start} - {offer.pickup_end}
                      </p>
                    </div>
                  </div>

                  {offer.active ? (
                    <button
                      onClick={() => deactivateOffer(offer.id)}
                      disabled={updatingOfferId !== null}
                      className="min-h-12 w-full rounded-full bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {updatingOfferId === offer.id
                        ? "Deactivating..."
                        : "Deactivate"}
                    </button>
                  ) : (
                    <span className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gray-100 px-5 py-3 font-bold text-gray-600 sm:w-auto">
                      No longer public
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <h2 className="text-2xl font-black sm:text-3xl">Reservations</h2>

          <div className="mt-6 grid gap-4">
            {orders.length === 0 && (
              <p className="font-medium text-gray-600">No reservations yet.</p>
            )}

            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-5 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <h3 className="text-xl font-black sm:text-2xl">{order.offers?.title}</h3>

                  <p className="mt-2 font-semibold text-gray-700">
                    Customer: {order.profiles?.email}
                  </p>

                  <p className="mt-1 font-black text-green-700">
                    ₾{order.offers?.price}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-black ${getOrderStatusClassName(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-4 py-2 font-mono text-sm font-black text-gray-700">
                      Code: {order.pickup_code || "------"}
                    </span>
                  </div>
                </div>

                {isConfirmedOrderStatus(order.status) && (
                  <button
                    onClick={() =>
                      void completeOrder(order.id, order.pickup_code || "")
                    }
                    disabled={updatingOrderId !== null}
                    className="min-h-12 w-full rounded-full bg-green-700 px-5 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                  >
                    {updatingOrderId === order.id
                      ? "Completing..."
                      : "Complete manually"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
