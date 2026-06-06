import { useState } from "react";
import { Coins, Lock } from "lucide-react";
import { PageShell } from "./PageShell";
import { MascotIcon } from "./MascotIcon";
import { coins, shopItems } from "./mockData";

const mono = { fontFamily: "'JetBrains Mono', monospace" };

export function ShopPage({ onBack }: { onBack: () => void }) {
  const [notice, setNotice] = useState(false);

  return (
    <PageShell
      title="Cửa hàng"
      tag="cửa_hàng"
      onBack={onBack}
      right={
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/15 text-yellow-500 text-xs font-bold" style={mono}>
          <Coins size={14} />
          {coins.toLocaleString()}
        </div>
      }
    >
      {notice && (
        <div className="mb-6 text-sm rounded-lg border border-primary/30 bg-primary/10 text-primary px-4 py-3">
          🔒 Tính năng mua sắm sẽ sớm ra mắt!
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-6">
        Dùng xu để mở khoá những linh vật đẹp hơn. (Dữ liệu mẫu — sẽ hoạt động sau.)
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {shopItems.map((item) => (
          <div key={item.id} className="relative p-5 rounded-xl border border-border bg-card text-center">
            {item.tag && (
              <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                {item.tag}
              </span>
            )}
            <div className="flex justify-center mb-3 opacity-90">
              <MascotIcon id={item.id} level={item.level} size={84} />
            </div>
            <div className="font-bold text-sm">{item.name}</div>
            <div className="flex items-center justify-center gap-1 text-xs text-yellow-500 font-bold mt-1 mb-3" style={mono}>
              <Coins size={12} />
              {item.price.toLocaleString()}
            </div>
            <button
              onClick={() => setNotice(true)}
              className="w-full py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <Lock size={13} /> Mua
            </button>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
