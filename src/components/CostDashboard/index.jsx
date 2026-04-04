import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, BarChart3, Zap, AlertTriangle } from "lucide-react";
import clsx from "clsx";

export function CostDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCosts();
    const interval = setInterval(fetchCosts, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchCosts() {
    try {
      const res = await fetch("/api/costs");
      setData(await res.json());
    } catch {}
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-full text-forge-muted text-xs">Loading...</div>;
  if (!data) return <div className="flex items-center justify-center h-full text-forge-muted text-xs">No cost data yet</div>;

  const dailyBudget = 20; // configurable
  const todayPct = Math.min((data.today.cost / dailyBudget) * 100, 100);
  const isOverBudget = data.today.cost > dailyBudget;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-forge-border flex items-center gap-3">
        <DollarSign size={16} className="text-forge-accent" />
        <h1 className="text-sm font-bold">Cost Dashboard</h1>
        <span className="text-xs text-forge-muted">{data.total.sessions} total sessions</span>
      </div>

      {/* Stats cards */}
      <div className="p-6 grid grid-cols-4 gap-4">
        <StatCard
          label="Today"
          value={`$${data.today.cost.toFixed(2)}`}
          sub={`${formatTokens(data.today.tokens)} tokens`}
          icon={Calendar}
          color={isOverBudget ? "text-forge-red" : "text-forge-green"}
        />
        <StatCard
          label="This Week"
          value={`$${data.week.cost.toFixed(2)}`}
          icon={TrendingUp}
          color="text-forge-blue"
        />
        <StatCard
          label="This Month"
          value={`$${data.month.cost.toFixed(2)}`}
          icon={BarChart3}
          color="text-forge-accent"
        />
        <StatCard
          label="All Time"
          value={`$${data.total.cost.toFixed(2)}`}
          sub={`${formatTokens(data.total.tokens)} tokens`}
          icon={Zap}
          color="text-purple-400"
        />
      </div>

      {/* Daily budget bar */}
      <div className="px-6 pb-4">
        <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-forge-text">Daily Budget</span>
            <div className="flex items-center gap-2">
              {isOverBudget && <AlertTriangle size={12} className="text-forge-red" />}
              <span className={clsx("text-xs font-bold", isOverBudget ? "text-forge-red" : "text-forge-green")}>
                ${data.today.cost.toFixed(2)} / ${dailyBudget}
              </span>
            </div>
          </div>
          <div className="w-full h-3 bg-forge-border rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500",
                todayPct > 90 ? "bg-forge-red" : todayPct > 70 ? "bg-forge-yellow" : "bg-forge-green"
              )}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-forge-muted">$0</span>
            <span className="text-[10px] text-forge-muted">${dailyBudget}</span>
          </div>
        </div>
      </div>

      {/* Chart - 30 day trend */}
      <div className="px-6 pb-4">
        <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-forge-text mb-3">30-Day Trend</h3>
          <div className="flex items-end gap-[2px] h-32">
            {data.dailyTrend.map((day, i) => {
              const maxCost = Math.max(...data.dailyTrend.map(d => d.cost), 0.01);
              const height = Math.max((day.cost / maxCost) * 100, 1);
              const isToday = i === data.dailyTrend.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div
                    className={clsx(
                      "w-full rounded-t transition-colors",
                      isToday ? "bg-forge-accent" : "bg-forge-border hover:bg-forge-muted"
                    )}
                    style={{ height: `${height}%`, minHeight: "2px" }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-forge-bg border border-forge-border rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                      <p className="text-forge-text font-semibold">{day.date}</p>
                      <p className="text-forge-muted">${day.cost.toFixed(3)} · {formatTokens(day.tokens)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-forge-muted">{data.dailyTrend[0]?.date}</span>
            <span className="text-[10px] text-forge-muted">Today</span>
          </div>
        </div>
      </div>

      {/* Project breakdown */}
      <div className="px-6 pb-6">
        <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-forge-text mb-3">By Project</h3>
          {data.projects.length === 0 ? (
            <p className="text-xs text-forge-muted">No project data yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.projects.map(proj => {
                const pct = data.total.cost > 0 ? (proj.cost / data.total.cost) * 100 : 0;
                return (
                  <div key={proj.name} className="flex items-center gap-3">
                    <span className="text-xs text-forge-text font-semibold w-24 truncate">{proj.name}</span>
                    <div className="flex-1 h-2 bg-forge-border rounded-full overflow-hidden">
                      <div className="h-full bg-forge-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-forge-muted w-16 text-right">${proj.cost.toFixed(2)}</span>
                    <span className="text-[10px] text-forge-muted w-12 text-right">{proj.sessions}s</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className={color} />
        <span className="text-[10px] text-forge-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className={clsx("text-lg font-bold", color)}>{value}</p>
      {sub && <p className="text-[10px] text-forge-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}
