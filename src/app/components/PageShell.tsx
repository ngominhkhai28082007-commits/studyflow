import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface PageShellProps {
  title: string;
  tag: string;          // mono label e.g. "thống_kê"
  onBack: () => void;
  right?: ReactNode;    // optional right-side header content
  children: ReactNode;
}

export function PageShell({ title, tag, onBack, right, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>
          <span
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="font-black text-lg tracking-tight"
          >
            {title}
          </span>
          <div className="min-w-[80px] flex justify-end">{right}</div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div
          className="text-xs text-primary uppercase tracking-widest mb-6"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {tag}
        </div>
        {children}
      </div>
    </div>
  );
}
