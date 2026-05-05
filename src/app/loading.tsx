export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#120d1f" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: "#2e2050", borderTopColor: "#d4860a" }} />
        <p className="text-sm font-medium" style={{ color: "#e8d5a0", opacity: 0.5 }}>Loading…</p>
      </div>
    </div>
  );
}
