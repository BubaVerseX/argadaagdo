"use client";

import { FilterBar } from "@/components/FilterBar";
import { LoadingState } from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  getRatingLabel,
  isOfferReservable,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { paginateItems } from "@/lib/pagination";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { Business, Offer } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BusinessSort = "rating" | "newest" | "alphabetical";
type BusinessOfferFilter = "all" | "with-offers" | "no-offers";

const BUSINESS_PAGE_SIZE = 12;
const BUSINESS_QUERY_LIMIT = 300;
const BUSINESS_OFFER_QUERY_LIMIT = 500;

function getBusinessInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "A";
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [search, setSearch] = useState("");
  const [businessType, setBusinessType] = useState("all");
  const [offerFilter, setOfferFilter] = useState<BusinessOfferFilter>("all");
  const [sort, setSort] = useState<BusinessSort>("rating");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBusinesses() {
      await processExpiredMarketplace();

      const [businessResult, offerResult, summaries] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, owner_id, name, business_type, address, phone, approved")
          .eq("approved", true)
          .order("id", { ascending: false })
          .limit(BUSINESS_QUERY_LIMIT),
        supabase
          .from("offers")
          .select(
            "id, business_id, title, category, price, old_price, quantity, pickup_date, pickup_start, pickup_end, active, status, image_url"
          )
          .eq("active", true)
          .gt("quantity", 0)
          .order("id", { ascending: false })
          .limit(BUSINESS_OFFER_QUERY_LIMIT),
        loadBusinessRatingSummaries(),
      ]);

      if (!active) return;

      if (businessResult.error || offerResult.error) {
        setMessage("Businesses could not be loaded. Please try again.");
        setBusinesses([]);
        setOffers([]);
        setLoading(false);
        return;
      }

      setBusinesses((businessResult.data || []) as Business[]);
      setOffers((offerResult.data || []) as Offer[]);
      setRatingSummaries(summaries);
      setLoading(false);
    }

    void loadBusinesses();

    return () => {
      active = false;
    };
  }, []);

  const activeOfferCountByBusiness = useMemo(() => {
    return offers.reduce<Record<number, number>>((offerMap, offer) => {
      if (isOfferReservable(offer)) {
        offerMap[offer.business_id] = (offerMap[offer.business_id] || 0) + 1;
      }

      return offerMap;
    }, {});
  }, [offers]);

  const businessTypes = useMemo(() => {
    return Array.from(
      new Set(
        businesses
          .map((business) => business.business_type?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((first, second) => first.localeCompare(second));
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchingBusinesses = businesses.filter((business) => {
      const activeOfferCount = activeOfferCountByBusiness[business.id] || 0;
      const searchText =
        `${business.name} ${business.business_type} ${business.address}`.toLowerCase();
      const matchesSearch =
        normalizedSearch === "" || searchText.includes(normalizedSearch);
      const matchesType =
        businessType === "all" || business.business_type === businessType;
      const matchesOfferFilter =
        offerFilter === "all" ||
        (offerFilter === "with-offers" && activeOfferCount > 0) ||
        (offerFilter === "no-offers" && activeOfferCount === 0);

      return matchesSearch && matchesType && matchesOfferFilter;
    });

    return [...matchingBusinesses].sort((first, second) => {
      if (sort === "alphabetical") return first.name.localeCompare(second.name);
      if (sort === "newest") return second.id - first.id;

      const firstRating = ratingSummaries[first.id]?.average_rating || 0;
      const secondRating = ratingSummaries[second.id]?.average_rating || 0;

      if (firstRating !== secondRating) return secondRating - firstRating;
      return first.name.localeCompare(second.name);
    });
  }, [
    activeOfferCountByBusiness,
    businesses,
    businessType,
    offerFilter,
    ratingSummaries,
    search,
    sort,
  ]);

  const paginatedBusinesses = useMemo(
    () => paginateItems(filteredBusinesses, page, BUSINESS_PAGE_SIZE),
    [filteredBusinesses, page]
  );

  function resetFilters() {
    setSearch("");
    setBusinessType("all");
    setOfferFilter("all");
    setSort("rating");
    setPage(1);
  }

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-10">
            <p className="text-xs font-black uppercase tracking-widest text-green-700 md:text-sm">
              Local businesses
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              Discover verified Tbilisi businesses
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-gray-600 md:text-lg">
              Search bakeries, cafes, restaurants and shops that are approved
              to publish surprise bags on ArGadaagdo.
            </p>
          </div>

          {message && (
            <div className="mt-5">
              <Notice tone="error">{message}</Notice>
            </div>
          )}

          <FilterBar
            className="mt-6"
            title="Find a business"
            description="Search by name, type or address. Sort by rating, newest or alphabetical."
          >
            <SearchBar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search businesses..."
              label="Search businesses"
            />

            <select
              value={businessType}
              onChange={(event) => {
                setBusinessType(event.target.value);
                setPage(1);
              }}
              aria-label="Filter businesses by type"
              className="min-h-12 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="all">All business types</option>
              {businessTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={offerFilter}
              onChange={(event) => {
                setOfferFilter(event.target.value as BusinessOfferFilter);
                setPage(1);
              }}
              aria-label="Filter businesses by offer availability"
              className="min-h-12 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="all">All businesses</option>
              <option value="with-offers">With active offers</option>
              <option value="no-offers">No active offers</option>
            </select>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as BusinessSort);
                setPage(1);
              }}
              aria-label="Sort businesses"
              className="min-h-12 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="rating">Highest rated</option>
              <option value="newest">Newest</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </FilterBar>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-black text-gray-700">
              {filteredBusinesses.length}{" "}
              {filteredBusinesses.length === 1 ? "business" : "businesses"}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-11 rounded-full bg-white px-5 py-2.5 font-black text-green-800 shadow-sm transition hover:bg-green-50"
            >
              Clear filters
            </button>
          </div>

          {loading && (
            <LoadingState
              className="mt-6"
              title="Loading businesses..."
              description="Checking approved local businesses."
            />
          )}

          {!loading && filteredBusinesses.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-green-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-black text-gray-950">
                No businesses found
              </h2>
              <p className="mx-auto mt-2 max-w-lg font-semibold leading-7 text-gray-600">
                Try clearing filters or browsing offers directly. New verified
                businesses will appear here as the pilot grows.
              </p>
              <Link
                href="/offers"
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-green-700 px-6 py-3 font-black text-white"
              >
                Browse Offers
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedBusinesses.items.map((business) => {
              const rating = ratingSummaries[business.id];
              const activeOfferCount =
                activeOfferCountByBusiness[business.id] || 0;

              return (
                <Link
                  key={business.id}
                  href={`/businesses/${business.id}`}
                  className="premium-card rounded-3xl p-5 transition hover:-translate-y-1 hover:shadow-xl sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-2xl font-black text-green-800">
                      {getBusinessInitials(business.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-2xl font-black">
                          {business.name}
                        </h2>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-800">
                          Verified
                        </span>
                      </div>
                      <p className="mt-2 font-semibold text-gray-600">
                        {business.business_type || "Food business"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-yellow-50 p-4">
                      <p className="text-xs font-black text-yellow-800">Rating</p>
                      <p className="mt-1 text-sm font-black text-gray-950">
                        {getRatingLabel(rating)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-green-50 p-4">
                      <p className="text-xs font-black text-green-800">Offers</p>
                      <p className="mt-1 text-2xl font-black text-gray-950">
                        {activeOfferCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F7F6EF] p-4">
                      <p className="text-xs font-black text-gray-600">Sort ID</p>
                      <p className="mt-1 text-2xl font-black text-gray-950">
                        #{business.id}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 font-semibold leading-7 text-gray-600">
                    {business.address || "Address unavailable"}
                  </p>

                  <span className="mt-5 inline-flex min-h-11 items-center rounded-full bg-green-700 px-5 py-2.5 font-black text-white">
                    View business
                  </span>
                </Link>
              );
            })}
          </div>

          <Pagination
            className="mt-8"
            page={paginatedBusinesses.page}
            totalItems={filteredBusinesses.length}
            pageSize={BUSINESS_PAGE_SIZE}
            label="Businesses"
            onPageChange={setPage}
          />
        </div>
      </section>
    </main>
  );
}
