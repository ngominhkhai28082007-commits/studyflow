import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Coins, Check } from "lucide-react";
import { PageShell } from "./PageShell";
import { MascotIcon } from "./MascotIcon";
import { getShop, buyMascot, type ShopState } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', monospace" };

export function ShopPage({ onBack }: { onBack: () => void }) {
  const [shop, setShop] = useState<ShopState | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    getShop()
      .then(setShop)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Không tải được cửa hàng"));
  }, []);

  const buy = async (id: string) => {
    setBuyingId(id);
    try {
      const next = await buyMascot(id);
      setShop(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không mua được");
    } finally {
      setBuyingId(null);
    }
  };

  const coinBadge = (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/15 text-yellow-500 text-xs font-bold" style={mono}>
      <Coins size={14} />
      {(shop?.coins ?? 0).toLocaleString()}
    </div>
  );

  if (!shop && !error) {
    return (
      <PageShell title="Cửa hàng" tag="cửa_hàng" onBack={onBack} right={coinBadge}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Cửa hàng" tag="cửa_hàng" onBack={onBack} right={coinBadge}>
      <p className="text-sm text-muted-foreground mb-6">
        Học để kiếm xu (1 phút = 1 xu), rồi mở khoá linh vật mới. Đã mua là của bạn mãi mãi.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {shop!.mascots.filter((m) => m.purchasable).map((item) => {
          const canAfford = shop!.coins >= item.price;
          return (
            <div key={item.id} className="relative p-5 rounded-xl border border-border bg-card text-center">
              <div className="flex justify-center mb-3 opacity-90">
                <MascotIcon id={item.id} level={shop!.level} size={84} />
              </div>
              <div className="font-bold text-sm">{item.name}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-yellow-500 font-bold mt-1 mb-3" style={mono}>
                <Coins size={12} />
                {item.price.toLocaleString()}
              </div>
              {item.owned ? (
                <div className="w-full py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Check size={14} /> Đã sở hữu
                </div>
              ) : (
                <button
                  onClick={() => buy(item.id)}
                  disabled={!canAfford || buyingId === item.id}
                  className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buyingId === item.id ? "Đang mua…" : canAfford ? "Mua" : "Chưa đủ xu"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
