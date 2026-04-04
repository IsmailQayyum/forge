import fs from "fs";
import path from "path";
import os from "os";

const STORE_PATH = path.join(os.homedir(), ".claude", "forge", "cost-history.json");

// Pricing per million tokens (Opus 4)
const PRICING = {
  input: 15,
  output: 75,
  cacheRead: 1.5,   // 90% discount
  cacheWrite: 18.75, // 25% premium
};

function load() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    }
  } catch {}
  return { entries: [], dailyTotals: {} };
}

function save(data) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekKey(ts) {
  const d = new Date(ts);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calculateCost(usage) {
  const { input = 0, output = 0, cacheRead = 0, cacheWrite = 0 } = usage;
  return (
    (input / 1_000_000) * PRICING.input +
    (output / 1_000_000) * PRICING.output +
    (cacheRead / 1_000_000) * PRICING.cacheRead +
    (cacheWrite / 1_000_000) * PRICING.cacheWrite
  );
}

export const costStore = {
  /**
   * Record a session's token usage snapshot.
   */
  record(sessionId, project, usage, ts) {
    const data = load();
    const cost = calculateCost(usage);
    const day = dateKey(ts || Date.now());

    const entry = {
      sessionId,
      project,
      usage,
      cost,
      ts: ts || Date.now(),
      day,
    };

    // Upsert by sessionId (keep latest snapshot)
    const existing = data.entries.findIndex((e) => e.sessionId === sessionId);
    if (existing >= 0) {
      data.entries[existing] = entry;
    } else {
      data.entries.push(entry);
    }

    // Rebuild daily totals
    data.dailyTotals = {};
    for (const e of data.entries) {
      if (!data.dailyTotals[e.day]) {
        data.dailyTotals[e.day] = { cost: 0, tokens: 0, sessions: 0 };
      }
      data.dailyTotals[e.day].cost += e.cost;
      data.dailyTotals[e.day].tokens += (e.usage.input || 0) + (e.usage.output || 0);
      data.dailyTotals[e.day].sessions += 1;
    }

    save(data);
    return entry;
  },

  /**
   * Get cost summary with breakdowns.
   */
  getSummary() {
    const data = load();
    const now = Date.now();
    const today = dateKey(now);
    const thisWeek = weekKey(now);
    const thisMonth = monthKey(now);

    let totalCost = 0;
    let totalTokens = 0;
    let todayCost = 0;
    let todayTokens = 0;
    let weekCost = 0;
    let monthCost = 0;

    const projectCosts = {};

    for (const entry of data.entries) {
      const cost = entry.cost;
      const tokens = (entry.usage.input || 0) + (entry.usage.output || 0);

      totalCost += cost;
      totalTokens += tokens;

      if (entry.day === today) {
        todayCost += cost;
        todayTokens += tokens;
      }
      if (weekKey(entry.ts) === thisWeek) weekCost += cost;
      if (monthKey(entry.ts) === thisMonth) monthCost += cost;

      const proj = entry.project || "unknown";
      if (!projectCosts[proj]) projectCosts[proj] = { cost: 0, tokens: 0, sessions: 0 };
      projectCosts[proj].cost += cost;
      projectCosts[proj].tokens += tokens;
      projectCosts[proj].sessions += 1;
    }

    // Daily trend (last 30 days)
    const dailyTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = dateKey(d.getTime());
      dailyTrend.push({
        date: key,
        cost: data.dailyTotals[key]?.cost || 0,
        tokens: data.dailyTotals[key]?.tokens || 0,
        sessions: data.dailyTotals[key]?.sessions || 0,
      });
    }

    return {
      total: { cost: totalCost, tokens: totalTokens, sessions: data.entries.length },
      today: { cost: todayCost, tokens: todayTokens },
      week: { cost: weekCost },
      month: { cost: monthCost },
      projects: Object.entries(projectCosts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.cost - a.cost),
      dailyTrend,
      pricing: PRICING,
    };
  },

  getEntries() {
    return load().entries;
  },
};
