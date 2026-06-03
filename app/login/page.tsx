"use client";

import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import { getProfileById } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "success" | "error" | "warning"
  >("success");
  const [submitting, setSubmitting] = useState(false);

  async function createAccount() {
    setMessage("");
    setMessageTone("error");

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setMessage("Creating account...");
    setMessageTone("success");

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { role },
      },
    });

    if (error) {
      setSubmitting(false);
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    if (data.session && data.user) {
      await getProfileById(data.user.id, 4);
      setSubmitting(false);
      setMessageTone("success");
      setMessage("Account created. Redirecting...");

      router.push(role === "business" ? "/business/register" : "/offers");
      router.refresh();
      return;
    }

    setSubmitting(false);
    setMessageTone("success");
    setMessage(
      role === "business"
        ? "Business account created. Check your email if confirmation is required, then sign in to submit your business."
        : "Account created. Check your email if confirmation is required, then sign in."
    );
  }

  async function signIn() {
    setMessage("");
    setMessageTone("error");

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (!password.trim()) {
      setMessage("Password is required.");
      return;
    }

    setSubmitting(true);
    setMessage("Signing in...");
    setMessageTone("success");

    const normalizedEmail = email.trim().toLowerCase();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setSubmitting(false);
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    const profile = await getProfileById(authData.user.id, 4);
    const metadataRole = authData.user.user_metadata?.role;
    const resolvedRole =
      profile?.role ||
      (metadataRole === "business" || metadataRole === "customer"
        ? metadataRole
        : "customer");

    setSubmitting(false);

    if (!profile) {
      setMessageTone("warning");
      setMessage(
        "Signed in. Your profile is still being prepared, so dashboard links may appear after a refresh."
      );
    }

    if (resolvedRole === "admin") {
      router.push("/admin");
      router.refresh();
      return;
    }

    if (resolvedRole === "business") {
      router.push("/business/dashboard");
      router.refresh();
      return;
    }

    router.push("/offers");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-900">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:items-center">
          <div className="rounded-3xl bg-green-800 p-6 text-white shadow-sm sm:rounded-[2rem] sm:p-8 md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              Welcome back
            </p>

            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl md:text-6xl">
              Sign in and rescue food in Tbilisi
            </h1>

            <p className="mt-4 text-base font-medium leading-7 text-green-50 sm:mt-5 sm:text-lg sm:leading-8">
              Customers can reserve food offers. Businesses can publish leftover
              food boxes after admin approval.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-3xl bg-white/10 p-5">
                <h3 className="text-xl font-black">For customers</h3>
                <p className="mt-2 font-medium text-green-50">
                  Browse discounted food and reserve pickup-only offers.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <h3 className="text-xl font-black">For businesses</h3>
                <p className="mt-2 font-medium text-green-50">
                  Register your business and publish rescue offers.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8 md:p-10">
            <h2 className="text-2xl font-black text-gray-950 sm:text-3xl">
              Sign In / Register
            </h2>

            <p className="mt-2 font-medium text-gray-600">
              Use the same form to create an account or sign in.
            </p>

            <div className="mt-6 grid gap-4">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                aria-label="Email address"
                placeholder="Email"
                className="rounded-2xl border bg-white p-4 font-medium outline-none"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                aria-label="Password"
                placeholder="Password"
                className="rounded-2xl border bg-white p-4 font-medium outline-none"
              />

              <div>
                <p className="mb-3 font-black text-gray-800">
                  Account type
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`rounded-2xl border p-4 text-left font-bold ${
                      role === "customer"
                        ? "border-green-700 bg-green-50 text-green-800"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <div className="text-2xl">🥡</div>
                    <p className="mt-2">Customer</p>
                    <p className="mt-1 text-sm font-medium">
                      Reserve food offers
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("business")}
                    className={`rounded-2xl border p-4 text-left font-bold ${
                      role === "business"
                        ? "border-green-700 bg-green-50 text-green-800"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <div className="text-2xl">🏪</div>
                    <p className="mt-2">Business</p>
                    <p className="mt-1 text-sm font-medium">
                      Publish food offers
                    </p>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={signIn}
                disabled={submitting}
                className="min-h-12 rounded-full bg-green-700 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={createAccount}
                disabled={submitting}
                className="min-h-12 rounded-full border border-gray-300 bg-white py-3 font-black text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
              >
                Create Account
              </button>

              {message && (
                <Notice tone={messageTone}>{message}</Notice>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
