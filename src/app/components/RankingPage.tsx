import { useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { MascotIcon } from "./MascotIcon";
import { getLeaderboard, type ApiRankUser } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', monospace" };
const rankEmoji = ["🥇", "🥈", "🥉"];

export function RankingPage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<ApiRankUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLeaderboard()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được bảng xếp hạng"));
  }, []);

  if (error) {
    return (
      <PageShell title="Xếp hạng" tag="xếp_hạng" onBack={onBack}>
        <div className="text-sm text-red-400">{error}</div>
      </PageShell>
    );
  }
  if (!rows) {
    return (
      <PageShell title="Xếp hạng" tag="xếp_hạng" onBack={onBack}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  const me = rows.find((u) => u.isMe);

  return (
    <PageShell title="Xếp hạng" tag="xếp_hạng" onBack={onBack}>
      {rows.length === 0 && (
        <div className="text-sm text-muted-foreground mb-6">
          Chưa có ai học trong tuần này. Hãy là người đầu tiên!
        </div>
      )}

      {me && (
        <div className="mb-6 p-5 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-4">
          <MascotIcon id={me.mascotId} level={me.level} size={56} />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Hạng của bạn tuần này</div>
            <div className="text-3xl font-black text-primary" style={mono}>#{me.rank}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-bold tabular-nums" style={mono}>{me.hours}h</div>
            <div className="text-xs text-muted-foreground">🔥 {me.streak} ngày</div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Top học viên tuần này</span>
          <span className="text-xs text-muted-foreground" style={mono}>live</span>
        </div>
        {rows.map((u, i) => (
          <div
            key={`${u.rank}-${u.name}`}
            className={`px-4 py-3 flex items-center gap-3 ${
              i < rows.length - 1 ? "border-b border-border" : ""
            } ${u.isMe ? "bg-primary/10" : "hover:bg-primary/5"} transition-colors`}
          >
            <div
              className="w-7 text-center font-bold text-sm"
              style={{ ...mono, color: u.rank <= 3 ? "#ff4e00" : "var(--muted-foreground)" }}
            >
              {u.rank <= 3 ? rankEmoji[u.rank - 1] : u.rank}
            </div>
            <MascotIcon id={u.mascotId} level={u.level} size={40} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {u.name}
                {u.isMe && <span className="ml-2 text-xs text-primary">(Bạn)</span>}
              </div>
              <div className="text-xs text-muted-foreground" style={mono}>🔥 {u.streak} ngày</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-sm tabular-nums" style={mono}>{u.hours}h</div>
              <div className="text-xs text-muted-foreground">tuần này</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
