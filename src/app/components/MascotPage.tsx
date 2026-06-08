import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { PageShell } from "./PageShell";
import { MascotIcon } from "./MascotIcon";
import { getShop, selectMascot, type ShopState } from "../lib/api";

interface MascotPageProps {
  onBack: () => void;
  onChanged?: () => void; // notify Dashboard so the header mascot refreshes
}

export function MascotPage({ onBack, onChanged }: MascotPageProps) {
  const [shop, setShop] = useState<ShopState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShop()
      .then(setShop)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được linh vật"));
  }, []);

  const choose = async (id: string) => {
    setError(null);
    try {
      const { selectedMascot } = await selectMascot(id);
      setShop((prev) => (prev ? { ...prev, selectedMascot } : prev));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không chọn được linh vật");
    }
  };

  if (!shop && !error) {
    return (
      <PageShell title="Chọn linh vật" tag="studicon" onBack={onBack}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Chọn linh vật" tag="studicon" onBack={onBack}>
      {error && <div className="mb-6 text-sm text-red-400">{error}</div>}
      <p className="text-sm text-muted-foreground mb-6">
        Chọn linh vật đại diện cho bạn. Linh vật sẽ tự lên cấp theo giờ học.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(shop?.mascots ?? []).map((m) => {
          const isSelected = m.id === shop!.selectedMascot;
          return (
            <button
              key={m.id}
              disabled={!m.owned}
              onClick={() => m.owned && choose(m.id)}
              className={`relative p-5 rounded-xl border text-center transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/40"
              } ${!m.owned ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                  <Check size={14} />
                </div>
              )}
              <div className="flex justify-center mb-3">
                <MascotIcon id={m.id} level={shop!.level} size={84} />
              </div>
              <div className="font-bold text-sm">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1 mb-3 min-h-[16px]">{m.desc}</div>
              {!m.owned ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock size={12} /> Chưa sở hữu
                </span>
              ) : isSelected ? (
                <span className="text-xs font-semibold text-primary">Đang dùng</span>
              ) : (
                <span className="text-xs font-semibold text-foreground">Chọn</span>
              )}
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
