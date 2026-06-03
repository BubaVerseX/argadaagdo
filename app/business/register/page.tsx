"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { getProfileById } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("Cafe");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">(
    "success"
  );
  const [submitting, setSubmitting] = useState(false);

  async function registerBusiness() {
    if (submitting) return;

    setMessage("");
    setMessageTone("error");

    if (!name.trim()) {
      setMessage("Business name is required.");
      return;
    }

    if (!address.trim()) {
      setMessage("Address is required.");
      return;
    }

    if (!phone.trim()) {
      setMessage("Phone number is required.");
      return;
    }

    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setSubmitting(false);
      router.push("/login");
      return;
    }

    const profile = await getProfileById(userData.user.id, 4);

    if (!profile) {
      setSubmitting(false);
      setMessage(
        "Your account profile is still being created. Please wait a moment and try again."
      );
      return;
    }

    const { error } = await supabase.from("businesses").insert({
      owner_id: userData.user.id,
      name: name.trim(),
      business_type: businessType,
      address: address.trim(),
      phone: phone.trim(),
      approved: false,
    });

    if (error) {
      setSubmitting(false);
      setMessage(
        error.message.includes("row-level security")
          ? "Business registration was blocked by security rules. Please make sure you are signed in and try again."
          : error.message
      );
      return;
    }

    setName("");
    setBusinessType("Cafe");
    setAddress("");
    setPhone("");

    setSubmitting(false);
    setMessageTone("success");
    setMessage("Business submitted. Waiting for admin approval.");
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-900">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                For local businesses
              </p>

              <h1 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl md:text-6xl">
                Register your food business
              </h1>

              <p className="mt-4 text-base font-medium leading-7 text-gray-700 sm:mt-5 sm:text-lg sm:leading-8">
                Join ArGadaagdo and sell leftover food boxes to customers in
                Tbilisi. After admin approval, you can publish offers from your
                dashboard.
              </p>

              <div className="mt-8 grid gap-4">
                <div className="rounded-3xl bg-green-50 p-5">
                  <h3 className="text-xl font-black text-green-800">
                    1. Submit business
                  </h3>
                  <p className="mt-2 font-medium text-green-700">
                    Add your name, type, address and phone number.
                  </p>
                </div>

                <div className="rounded-3xl bg-yellow-50 p-5">
                  <h3 className="text-xl font-black text-yellow-800">
                    2. Wait for approval
                  </h3>
                  <p className="mt-2 font-medium text-yellow-700">
                    Admin reviews and approves your business.
                  </p>
                </div>

                <div className="rounded-3xl bg-green-50 p-5">
                  <h3 className="text-xl font-black text-green-800">
                    3. Publish offers
                  </h3>
                  <p className="mt-2 font-medium text-green-700">
                    Create pickup-only food rescue offers.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-[#F7F6EF] p-5 sm:rounded-[2rem] sm:p-6">
              <h2 className="text-2xl font-black text-gray-950">
                Business details
              </h2>

              <div className="mt-6 grid gap-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Business name"
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                />

                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                >
                  <option value="Cafe">Cafe</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Supermarket">Supermarket</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address in Tbilisi"
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                />

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="rounded-2xl border bg-white p-4 font-medium outline-none"
                />

                <button
                  type="button"
                  onClick={registerBusiness}
                  disabled={submitting}
                  className="min-h-12 rounded-full bg-green-700 px-8 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
                >
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </button>

                {message && (
                  <Notice tone={messageTone}>{message}</Notice>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
