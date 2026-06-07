import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Clock, Flame, Target, CalendarDays } from "lucide-react";
import { PageShell } from "./PageShell";
import { getStats, type ApiStats } from "../lib/api";

const mono = { fontFamily: "'JetBrains Mono', monospace" };

function StatCard({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <div className="text-2xl font-black tabular-nums" style={mono}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export function StatsPage({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được thống kê"));
  }, []);

  if (error) {
    return (
      <PageShell title="Thống kê" tag="thống_kê" onBack={onBack}>
        <div className="text-sm text-red-400">{error}</div>
      </PageShell>
    );
  }
  if (!stats) {
    return (
      <PageShell title="Thống kê" tag="thống_kê" onBack={onBack}>
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      </PageShell>
    );
  }

  const maxH = Math.max(0, ...stats.weeklyStudy.map((d) => d.hours));

  return (
    <PageShell title="Thống kê" tag="thống_kê" onBack={onBack}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} value={`${stats.totalWeekHours}h`} label="Tuần này" />
        <StatCard icon={CalendarDays} value={`${stats.totalMonthHours}h`} label="Tháng này" />
        <StatCard icon={Flame} value={`${stats.streakDays} ngày`} label="Streak" />
        <StatCard icon={Target} value={`${stats.sessions}`} label="Phiên học" />
      </div>

      <div className="p-6 rounded-xl bg-card border border-border">
        <div className="text-sm font-semibold mb-1">Giờ học 7 ngày qua</div>
        <div className="text-xs text-muted-foreground mb-5">
          Trung bình {stats.avgPerDayHours}h/ngày · Cao nhất {stats.bestDayHours}h
        </div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={stats.weeklyStudy} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,78,0,0.08)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}h`, "Giờ học"]}
              />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {stats.weeklyStudy.map((d, i) => (
                  <Cell key={i} fill={maxH > 0 && d.hours === maxH ? "#ff4e00" : "rgba(255,78,0,0.35)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageShell>
  );
}
