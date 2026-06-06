import { Check, Lock } from "lucide-react";
import { PageShell } from "./PageShell";
import { MascotIcon } from "./MascotIcon";
import { mascots } from "./mockData";

interface MascotPageProps {
  onBack: () => void;
  selected: string;
  onSelect: (id: string) => void;
}

export function MascotPage({ onBack, selected, onSelect }: MascotPageProps) {
  return (
    <PageShell title="Chọn linh vật" tag="studicon" onBack={onBack}>
      <p className="text-sm text-muted-foreground mb-6">
        Chọn linh vật đại diện cho bạn. Linh vật sẽ tự lên cấp theo giờ học.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mascots.map((m) => {
          const isSelected = m.id === selected;
          return (
            <button
              key={m.id}
              disabled={m.locked}
              onClick={() => m.owned && onSelect(m.id)}
              className={`relative p-5 rounded-xl border text-center transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/40"
              } ${m.locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                  <Check size={14} />
                </div>
              )}
              <div className="flex justify-center mb-3">
                <MascotIcon id={m.id} level={m.level} size={84} />
              </div>
              <div className="font-bold text-sm">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1 mb-3 min-h-[16px]">{m.desc}</div>
              {m.locked ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock size={12} /> Sắp có
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
