import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Clock, Flame, Target, CalendarDays } from "lucide-react";
import { PageShell } from "./PageShell";
import { stats, weeklyStudy } from "./mockData";

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
  const maxH = Math.max(...weeklyStudy.map((d) => d.hours));
  return (
    <PageShell title="Thống kê" tag="thống_kê" onBack={onBack}>
      <div className="mb-6 text-xs text-muted-foreground rounded-lg border border-border bg-card px-4 py-3">
        ⏳ Đang dùng dữ liệu mẫu — số liệu thật sẽ tự cập nhật khi có backend.
      </div>

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
            <BarChart data={weeklyStudy} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
                {weeklyStudy.map((d, i) => (
                  <Cell key={i} fill={d.hours === maxH ? "#ff4e00" : "rgba(255,78,0,0.35)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageShell>
  );
}
