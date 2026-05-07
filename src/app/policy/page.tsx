import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT = "By using Omni-Verse, you agree to play fair and not abuse the platform. Any attempt to exploit the system may result in account suspension.";

export default async function PolicyPage() {
  let text = DEFAULT;

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "policy_text")
      .maybeSingle();
    if (data?.value) text = data.value;
  } catch { /* fall back to default */ }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold" style={{ color: "#e8d5a0" }}>Terms of Use</h1>
            <p className="mt-3 text-sm" style={{ color: "#e8d5a0", opacity: 0.55 }}>
              Last updated by the Omni-Verse team
            </p>
          </div>

          <div className="rounded-2xl p-8" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e8d5a0", opacity: 0.85 }}>
              {text}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
