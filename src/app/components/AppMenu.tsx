import { useState } from "react";
import { LayoutGrid, BarChart3, Trophy, Sparkles, ShoppingBag } from "lucide-react";

export type PanelKey = "stats" | "ranking" | "mascot" | "shop";

const ITEMS: { key: PanelKey; label: string; desc: string; icon: typeof BarChart3 }[] = [
  { key: "stats", label: "Thống kê", desc: "Giờ học, streak, biểu đồ", icon: BarChart3 },
  { key: "ranking", label: "Xếp hạng", desc: "Xem hạng của bạn", icon: Trophy },
  { key: "mascot", label: "Studicon", desc: "Chọn linh vật", icon: Sparkles },
  { key: "shop", label: "Cửa hàng", desc: "Mua mascot mới", icon: ShoppingBag },
];

export function AppMenu({ onSelect }: { onSelect: (key: PanelKey) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Mở menu"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          open ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"
        }`}
      >
        <LayoutGrid size={18} />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            {ITEMS.map((it) => (
              <button
                key={it.key}
                onClick={() => {
                  setOpen(false);
                  onSelect(it.key);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <it.icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{it.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
