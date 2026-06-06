import { PageShell } from "./PageShell";
import { DogAvatar } from "./DogAvatar";
import { leaderboard } from "./mockData";

const mono = { fontFamily: "'JetBrains Mono', monospace" };
const rankEmoji = ["🥇", "🥈", "🥉"];

export function RankingPage({ onBack }: { onBack: () => void }) {
  const me = leaderboard.find((u) => u.isMe);

  return (
    <PageShell title="Xếp hạng" tag="xếp_hạng" onBack={onBack}>
      {me && (
        <div className="mb-6 p-5 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-4">
          <DogAvatar level={me.level} size={56} />
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
          <span className="text-xs text-muted-foreground" style={mono}>mock</span>
        </div>
        {leaderboard.map((u, i) => (
          <div
            key={u.rank}
            className={`px-4 py-3 flex items-center gap-3 ${
              i < leaderboard.length - 1 ? "border-b border-border" : ""
            } ${u.isMe ? "bg-primary/10" : "hover:bg-primary/5"} transition-colors`}
          >
            <div
              className="w-7 text-center font-bold text-sm"
              style={{ ...mono, color: u.rank <= 3 ? "#ff4e00" : "var(--muted-foreground)" }}
            >
              {u.rank <= 3 ? rankEmoji[u.rank - 1] : u.rank}
            </div>
            <DogAvatar level={u.level} size={40} />
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
