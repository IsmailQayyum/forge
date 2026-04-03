import React, { useMemo } from "react";
import { Flame, TrendingUp, Clock } from "lucide-react";
import clsx from "clsx";

export function TokenBurnRate({ session }) {
  const stats = useMemo(() => {
    if (!session?.tokenUsage || !session?.startedAt) return null;

    const { input = 0, output = 0, cacheRead = 0, cacheWrite = 0 } = session.tokenUsage;
    const total = input + output;
    if (total === 0) return null;

    // Calculate burn rate (tokens per minute)
    const elapsedMs = Date.now() - session.startedAt;
    const elapsedMin = Math.max(elapsedMs / 60000, 0.5);
    const burnRate = total / elapsedMin;

    // Cost estimate (rough: $3/M input, $15/M output for Opus)
    const inputCost = (input / 1_000_000) * 3;
    const outputCost = (output / 1_000_000) * 15;
    const cacheSavings = (cacheRead / 1_000_000) * 2.7; // 90% savings on cache reads
    const totalCost = inputCost + outputCost - cacheSavings;

    // Cache hit rate
    const cacheHitRate = input > 0 ? (cacheRead / (input + cacheRead)) * 100 : 0;

    // Projection — how long until a daily budget (estimate $20/day for Max 5x)
    const costPerMin = totalCost / elapsedMin;
    const budgetRemaining = Math.max(20 - totalCost, 0);
    const minutesLeft = costPerMin > 0 ? budgetRemaining / costPerMin : Infinity;

    return {
      total,
      input,
      output,
      cacheRead,
      cacheWrite,
      burnRate: Math.round(burnRate),
      totalCost: totalCost.toFixed(3),
      cacheHitRate: cacheHitRate.toFixed(0),
      minutesLeft: minutesLeft === Infinity ? null : Math.round(minutesLeft),
      elapsedMin: Math.round(elapsedMin),
    };
  }, [session?.tokenUsage, session?.startedAt]);

  if (!stats) return null;

  const burnLevel =
    stats.burnRate > 5000 ? "critical" : stats.burnRate > 2000 ? "high" : "normal";

  return (
    <div className="px-4 py-3 border-b border-forge-border bg-forge-surface/30">
      <div className="flex items-center gap-2 mb-2">
        <Flame size={12} className={clsx(
          burnLevel === "critical" ? "text-forge-red" :
          burnLevel === "high" ? "text-forge-yellow" : "text-forge-muted"
        )} />
        <span className="text-[10px] text-forge-muted uppercase tracking-wider">Token usage</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Total" value={formatTokens(stats.total)} />
        <Stat label="Input" value={formatTokens(stats.input)} />
        <Stat label="Output" value={formatTokens(stats.output)} />
        <Stat label="Cache hit" value={`${stats.cacheHitRate}%`} />
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <TrendingUp size={10} className={clsx(
            burnLevel === "critical" ? "text-forge-red" :
            burnLevel === "high" ? "text-forge-yellow" : "text-forge-green"
          )} />
          <span className={clsx(
            "text-[10px] font-semibold",
            burnLevel === "critical" ? "text-forge-red" :
            burnLevel === "high" ? "text-forge-yellow" : "text-forge-green"
          )}>
            {formatTokens(stats.burnRate)}/min
          </span>
        </div>

        <span className="text-[10px] text-forge-muted">
          ~${stats.totalCost} spent
        </span>

        {stats.minutesLeft !== null && (
          <div className="flex items-center gap-1">
            <Clock size={10} className="text-forge-muted" />
            <span className={clsx(
              "text-[10px]",
              stats.minutesLeft < 30 ? "text-forge-red font-semibold" : "text-forge-muted"
            )}>
              ~{stats.minutesLeft < 60
                ? `${stats.minutesLeft}m left`
                : `${Math.round(stats.minutesLeft / 60)}h left`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-forge-muted">{label}</p>
      <p className="text-xs font-semibold text-forge-text">{value}</p>
    </div>
  );
}

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}
