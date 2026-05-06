"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function AccessBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "access") return null;
  return (
    <div className="px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3"
      style={{ backgroundColor: "#d4860a22", border: "1px solid #d4860a66", color: "#e8d5a0" }}>
      <span className="text-xl">🔒</span>
      <span>You need to purchase at least one category to access the Arena. Pick a plan below to get started.</span>
    </div>
  );
}

export default function BuyPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, 40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 px-6 py-16 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <Suspense fallback={null}>
            <AccessBanner />
          </Suspense>
          <div className="text-center">
            <h1 className="text-4xl font-extrabold" style={{ color: "#e8d5a0" }}>Choose Your Session</h1>
            <p className="mt-3 text-base" style={{ color: "#e8d5a0", opacity: 0.65 }}>
              Pay per category session — no subscriptions needed
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { categories: 1, price: 10, label: "Starter" },
              { categories: 3, price: 25, label: "Popular", highlight: true },
              { categories: 6, price: 45, label: "Full Arena" },
            ].map((plan) => (
              <div
                key={plan.categories}
                className="rounded-2xl p-7 flex flex-col items-center gap-4 relative"
                style={{
                  backgroundColor: plan.highlight ? "#7c3aed22" : "#1e1530",
                  border: `1px solid ${plan.highlight ? "#7c3aed" : "#2e2050"}`,
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#7c3aed", color: "#fff" }}>
                    Most Popular
                  </div>
                )}
                <h3 className="font-bold text-lg" style={{ color: "#e8d5a0" }}>{plan.label}</h3>
                <div>
                  <span className="text-4xl font-extrabold" style={{ color: "#d4860a" }}>{plan.price}</span>
                  <span className="text-sm ml-1" style={{ color: "#e8d5a0", opacity: 0.6 }}>SAR</span>
                </div>
                <p className="text-sm text-center" style={{ color: "#e8d5a0", opacity: 0.65 }}>
                  {plan.categories} {plan.categories === 1 ? "category" : "categories"} · 36 questions
                </p>
                <button
                  className="w-full py-2.5 rounded-full font-bold text-sm mt-2 transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: plan.highlight ? "#7c3aed" : "#d4860a",
                    color: plan.highlight ? "#fff" : "#120d1f",
                  }}
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>

          {/* Payment form placeholder */}
          <div className="rounded-2xl p-8 flex flex-col gap-5 max-w-lg mx-auto w-full" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="font-bold text-lg" style={{ color: "#e8d5a0" }}>Payment Details</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Cardholder Name</label>
              <input type="text" placeholder="Name on card" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Card Number</label>
              <input type="text" placeholder="•••• •••• •••• ••••" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Expiry</label>
                <input type="text" placeholder="MM / YY" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>CVV</label>
                <input type="text" placeholder="•••" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
              </div>
            </div>
            <p className="text-xs text-center" style={{ color: "#e8d5a0", opacity: 0.4 }}>
              Payment gateway coming soon. UI preview only.
            </p>
            <button
              className="w-full py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
              disabled
            >
              Complete Purchase
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
