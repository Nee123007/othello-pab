import React, { useEffect, useState, useMemo } from 'react';
import { Panel, Badge, Stat, Tabs, Formula } from '../design/components';
import { AlertTriangle, Trophy, ShieldCheck, Cpu } from 'lucide-react';
import { YBWCTreeStepper } from '../features/bench/YBWCTreeStepper';

/* ──────────────────────────────────────────────────────────────
   Types for the benchmark data files loaded from /data/*.json
   ────────────────────────────────────────────────────────────── */

interface HardwareInfo {
  cpu: string;
  physical_cores: number;
  logical_cores: number;
  ram_gb: number;
  os: string;
  compiler: string;
}

interface SummaryRow {
  algo: string;
  threads: number;
  depth: number;
  phase: string;
  positions_count: number;
  avg_time_ms: number;
  std_time_ms: number;
  avg_nodes: number;
  std_nodes: number;
  speedup_mean: number;
  speedup_std: number;
  efficiency_mean: number;
  sop_mean: number;
  sop_std: number;
  branching_factor_mean: number;
  value_agreement_pct: number;
}

interface TournamentRow {
  contestant: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate_pct: number;
  mean_disc_diff: number;
  ci_95: number;
  ci_lower: number;
  ci_upper: number;
}

type ActiveSection = 'overhead' | 'scaling' | 'failure' | 'verify' | 'tournament';

const ALGO_LABELS: Record<string, string> = {
  b2: 'Sequential α-β (B2)',
  p1: 'Root Splitting (P1)',
  p2: 'PVS (P2)',
  p3: 'YBWC (P3)',
};

const ALGO_COLORS: Record<string, string> = {
  b2: 'text-pearl',
  p1: 'text-text-400',
  p2: 'text-signal',
  p3: 'text-brass-400',
};

/**
 * Benchmarks page — shows real benchmark results from the engine
 * loaded from /data/*.json (converted from CSVs).
 */
export const BenchmarksPage: React.FC = () => {
  const [summary, setSummary] = useState<SummaryRow[] | null>(null);
  const [tournament, setTournament] = useState<TournamentRow[] | null>(null);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<ActiveSection>('overhead');

  useEffect(() => {
    Promise.all([
      fetch('/data/summary.json').then((r) => (r.ok ? r.json() : Promise.reject('summary.json not found'))),
      fetch('/data/tournament.json').then((r) => (r.ok ? r.json() : Promise.reject('tournament.json not found'))),
      fetch('/data/hardware.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([s, t, h]) => {
        setSummary(s);
        setTournament(t);
        setHardware(h);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Panel>
          <div className="flex items-center gap-2 text-danger text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>
              Could not load benchmark data: <strong>{error}</strong>
            </span>
          </div>
          <p className="text-xs text-text-400 mt-2">
            Run <code className="font-mono bg-ink-800 px-1 py-0.5 rounded">python tools/csv_to_json.py</code> to
            generate the data files, then restart the dev server.
          </p>
        </Panel>
      </div>
    );
  }

  if (!summary || !tournament) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center text-text-400 text-sm py-20">Loading benchmark data…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-100 tracking-tight">
            Benchmark Results
          </h1>
          <p className="text-xs text-text-400 mt-0.5">
            All numbers from real engine runs. Never fabricated.
          </p>
        </div>

        {hardware && (
          <div className="flex items-center gap-2 p-2 bg-ink-900 border border-ink-700 rounded-lg text-xs font-mono text-text-400">
            <Cpu className="w-4 h-4 text-brass-400 shrink-0" />
            <span>
              <strong className="text-text-100">{hardware.cpu}</strong> ({hardware.physical_cores}C/{hardware.logical_cores}T, {hardware.ram_gb}GB)
            </span>
          </div>
        )}
      </div>

      {/* Section nav */}
      <div className="mb-6 overflow-x-auto">
        <Tabs
          tabs={[
            { id: 'overhead', label: 'RQ1: Search Overhead' },
            { id: 'scaling', label: 'RQ2: Scaling' },
            { id: 'failure', label: 'RQ3: Move Ordering' },
            { id: 'verify', label: 'Verification' },
            { id: 'tournament', label: 'Tournament' },
          ]}
          activeTab={section}
          onChange={(id) => setSection(id as ActiveSection)}
        />
      </div>

      {section === 'overhead' && <OverheadSection data={summary} />}
      {section === 'scaling' && <ScalingSection data={summary} />}
      {section === 'failure' && <FailureSection data={summary} />}
      {section === 'verify' && <VerifySection data={summary} />}
      {section === 'tournament' && <TournamentSection data={tournament} />}
    </div>
  );
};

/* ── RQ1: Search Overhead ─────────────────────────────────── */

const OverheadSection: React.FC<{ data: SummaryRow[] }> = ({ data }) => {
  // Group by algo+threads, average SOP across depths/phases
  const grouped = useMemo(() => {
    const map = new Map<string, { sum: number; count: number; algo: string; threads: number }>();
    for (const row of data) {
      if (row.algo === 'b2') continue; // baseline has SOP=0
      const key = `${row.algo}_${row.threads}`;
      const entry = map.get(key) ?? { sum: 0, count: 0, algo: row.algo, threads: row.threads };
      entry.sum += row.sop_mean;
      entry.count += 1;
      map.set(key, entry);
    }
    return [...map.values()]
      .map((e) => ({ algo: e.algo, threads: e.threads, avgSop: e.sum / e.count }))
      .sort((a, b) => a.threads - b.threads || a.algo.localeCompare(b.algo));
  }, [data]);

  return (
    <div className="space-y-6">
      <Panel title="RQ1 — Search Overhead by Strategy">
      <div className="mb-3">
        <Formula math="SO_P = \\frac{N_P}{N_1} - 1" />
      </div>
      <p className="text-xs text-text-400 mb-4 leading-relaxed">
        Search overhead measures the extra nodes a parallel search explores compared to
        the sequential baseline. Lower is better — ideal is 0.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-700 text-text-400 uppercase tracking-wider">
              <th className="text-left py-2 pr-4">Algorithm</th>
              <th className="text-right py-2 px-3 font-mono">P</th>
              <th className="text-right py-2 px-3 font-mono">Avg SO<sub>P</sub></th>
              <th className="text-left py-2 pl-3">Bar</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((row) => {
              const pct = Math.min(row.avgSop * 100, 100);
              const algoColor = ALGO_COLORS[row.algo] ?? 'text-text-100';
              return (
                <tr key={`${row.algo}_${row.threads}`} className="border-b border-ink-700/40">
                  <td className={`py-2 pr-4 font-semibold ${algoColor}`}>
                    {ALGO_LABELS[row.algo] ?? row.algo}
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-text-100">{row.threads}</td>
                  <td className="text-right py-2 px-3 font-mono text-text-100">
                    {(row.avgSop * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 pl-3">
                    <div className="h-3 w-full max-w-[200px] bg-ink-800 rounded-sm overflow-hidden">
                      <div
                        className={`h-full rounded-sm ${
                          row.algo === 'p3'
                            ? 'bg-brass-400'
                            : row.algo === 'p2'
                              ? 'bg-signal'
                              : 'bg-text-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
    <YBWCTreeStepper />
  </div>
);
};

/* ── RQ2: Scaling ─────────────────────────────────────────── */

const ScalingSection: React.FC<{ data: SummaryRow[] }> = ({ data }) => {
  // Speedup table: algo × threads
  const algos = ['p1', 'p2', 'p3'];
  const threadCounts = [1, 2, 4, 8];

  const speedupTable = useMemo(() => {
    const result: Record<string, Record<number, { speedup: number; efficiency: number; count: number }>> = {};
    for (const algo of algos) result[algo] = {};
    for (const row of data) {
      if (!algos.includes(row.algo)) continue;
      if (!result[row.algo][row.threads]) {
        result[row.algo][row.threads] = { speedup: 0, efficiency: 0, count: 0 };
      }
      const entry = result[row.algo][row.threads];
      entry.speedup += row.speedup_mean;
      entry.efficiency += row.efficiency_mean;
      entry.count += 1;
    }
    return result;
  }, [data]);

  // Branching factor: depth → b*
  const bstarByDepth = useMemo(() => {
    const map = new Map<number, { sum: number; count: number }>();
    for (const row of data) {
      if (row.algo !== 'b2' || row.threads !== 1) continue;
      const e = map.get(row.depth) ?? { sum: 0, count: 0 };
      e.sum += row.branching_factor_mean;
      e.count += 1;
      map.set(row.depth, e);
    }
    return [...map.entries()]
      .map(([depth, e]) => ({ depth, bstar: e.sum / e.count }))
      .sort((a, b) => a.depth - b.depth);
  }, [data]);

  return (
    <div className="space-y-6">
      <Panel title="RQ2 — Speedup & Efficiency">
        <div className="mb-3 space-y-1">
          <Formula math="S_P = \\frac{T_1}{T_P}" />
          <Formula math="E_P = \\frac{S_P}{P}" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ink-700 text-text-400 uppercase tracking-wider">
                <th className="text-left py-2 pr-4">Algorithm</th>
                {threadCounts.map((t) => (
                  <th key={t} className="text-center py-2 px-2 font-mono" colSpan={2}>
                    P={t}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-ink-700/40 text-text-400 text-[10px]">
                <th />
                {threadCounts.map((t) => (
                  <React.Fragment key={t}>
                    <th className="text-right py-1 px-1 font-mono">S<sub>P</sub></th>
                    <th className="text-right py-1 px-1 font-mono">E<sub>P</sub></th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {algos.map((algo) => (
                <tr key={algo} className="border-b border-ink-700/40">
                  <td className={`py-2 pr-4 font-semibold ${ALGO_COLORS[algo]}`}>
                    {ALGO_LABELS[algo]}
                  </td>
                  {threadCounts.map((t) => {
                    const entry = speedupTable[algo]?.[t];
                    if (!entry || entry.count === 0) {
                      return (
                        <React.Fragment key={t}>
                          <td className="text-right py-2 px-1 font-mono text-text-400">—</td>
                          <td className="text-right py-2 px-1 font-mono text-text-400">—</td>
                        </React.Fragment>
                      );
                    }
                    const s = entry.speedup / entry.count;
                    const e = entry.efficiency / entry.count;
                    return (
                      <React.Fragment key={t}>
                        <td className="text-right py-2 px-1 font-mono text-text-100">
                          {s.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-1 font-mono text-text-100">
                          {e.toFixed(2)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Effective Branching Factor by Depth">
        <Formula math="b^* = N_1^{1/d}" />
        <div className="mt-3 flex flex-wrap gap-3">
          {bstarByDepth.map((row) => (
            <Stat
              key={row.depth}
              label={`d = ${row.depth}`}
              value={row.bstar.toFixed(2)}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
};

/* ── RQ3: Move Ordering & Failure Analysis ────────────────── */

const FailureSection: React.FC<{ data: SummaryRow[] }> = ({ data }) => {
  // Phase-wise analysis: early vs mid vs late
  const phaseStats = useMemo(() => {
    const map = new Map<string, { avgSop: number; avgSpeedup: number; count: number }>();
    for (const row of data) {
      if (row.algo === 'b2') continue;
      const entry = map.get(row.phase) ?? { avgSop: 0, avgSpeedup: 0, count: 0 };
      entry.avgSop += row.sop_mean;
      entry.avgSpeedup += row.speedup_mean;
      entry.count += 1;
      map.set(row.phase, entry);
    }
    return [...map.entries()]
      .map(([phase, e]) => ({
        phase,
        avgSop: e.avgSop / e.count,
        avgSpeedup: e.avgSpeedup / e.count,
      }))
      .sort((a, b) => a.phase.localeCompare(b.phase));
  }, [data]);

  return (
    <Panel title="RQ3 — Move Ordering & Phase Analysis">
      <p className="text-xs text-text-400 mb-4 leading-relaxed">
        How search overhead and speedup vary across game phases (early, mid, late).
        Poor move ordering in the midgame often leads to higher search overhead.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-700 text-text-400 uppercase tracking-wider">
              <th className="text-left py-2 pr-4">Phase</th>
              <th className="text-right py-2 px-3 font-mono">Avg SO<sub>P</sub></th>
              <th className="text-right py-2 px-3 font-mono">Avg S<sub>P</sub></th>
            </tr>
          </thead>
          <tbody>
            {phaseStats.map((row) => (
              <tr key={row.phase} className="border-b border-ink-700/40">
                <td className="py-2 pr-4 text-text-100 capitalize font-medium">{row.phase}</td>
                <td className="text-right py-2 px-3 font-mono text-text-100">
                  {(row.avgSop * 100).toFixed(1)}%
                </td>
                <td className="text-right py-2 px-3 font-mono text-text-100">
                  {row.avgSpeedup.toFixed(2)}×
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

/* ── Verification ─────────────────────────────────────────── */

const VerifySection: React.FC<{ data: SummaryRow[] }> = ({ data }) => {
  // Value agreement table by algo × threads
  const agreements = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const row of data) {
      const key = `${row.algo}_${row.threads}`;
      const entry = map.get(key) ?? { total: 0, count: 0 };
      entry.total += row.value_agreement_pct;
      entry.count += 1;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([key, e]) => {
        const [algo, threads] = key.split('_');
        return { algo, threads: Number(threads), pct: e.total / e.count };
      })
      .sort((a, b) => a.algo.localeCompare(b.algo) || a.threads - b.threads);
  }, [data]);

  return (
    <Panel title="Verification — Value Agreement">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-signal" />
        <p className="text-xs text-text-400">
          Parallel engines must return the same value as the sequential baseline (B2) at every depth.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-700 text-text-400 uppercase tracking-wider">
              <th className="text-left py-2 pr-4">Algorithm</th>
              <th className="text-right py-2 px-3 font-mono">P</th>
              <th className="text-right py-2 px-3 font-mono">Agreement</th>
              <th className="text-left py-2 pl-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {agreements.map((row) => (
              <tr key={`${row.algo}_${row.threads}`} className="border-b border-ink-700/40">
                <td className={`py-2 pr-4 font-semibold ${ALGO_COLORS[row.algo] ?? 'text-text-100'}`}>
                  {ALGO_LABELS[row.algo] ?? row.algo}
                </td>
                <td className="text-right py-2 px-3 font-mono text-text-100">{row.threads}</td>
                <td className="text-right py-2 px-3 font-mono text-text-100">
                  {row.pct.toFixed(1)}%
                </td>
                <td className="py-2 pl-3">
                  <Badge variant={row.pct >= 100 ? 'signal' : 'danger'}>
                    {row.pct >= 100 ? 'PASS' : 'FAIL'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

/* ── Tournament ───────────────────────────────────────────── */

const TournamentSection: React.FC<{ data: TournamentRow[] }> = ({ data }) => {
  return (
    <Panel title="Playing Strength — Round-Robin Tournament">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-brass-400" />
        <p className="text-xs text-text-400">
          Each contestant plays against all others. Win rate and disc differential with 95% confidence intervals.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-700 text-text-400 uppercase tracking-wider">
              <th className="text-left py-2 pr-4">Contestant</th>
              <th className="text-right py-2 px-2 font-mono">Games</th>
              <th className="text-right py-2 px-2 font-mono">W</th>
              <th className="text-right py-2 px-2 font-mono">D</th>
              <th className="text-right py-2 px-2 font-mono">L</th>
              <th className="text-right py-2 px-2 font-mono">Win%</th>
              <th className="text-right py-2 px-2 font-mono">Δ Discs</th>
              <th className="text-right py-2 px-2 font-mono">95% CI</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.contestant} className="border-b border-ink-700/40">
                <td className="py-2 pr-4 font-semibold text-text-100">{row.contestant}</td>
                <td className="text-right py-2 px-2 font-mono text-text-100">{row.games}</td>
                <td className="text-right py-2 px-2 font-mono text-signal">{row.wins}</td>
                <td className="text-right py-2 px-2 font-mono text-text-400">{row.draws}</td>
                <td className="text-right py-2 px-2 font-mono text-danger">{row.losses}</td>
                <td className="text-right py-2 px-2 font-mono text-text-100">
                  {row.win_rate_pct.toFixed(1)}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-100">
                  {row.mean_disc_diff > 0 ? '+' : ''}
                  {row.mean_disc_diff.toFixed(1)}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-400">
                  [{row.ci_lower.toFixed(1)}, {row.ci_upper.toFixed(1)}]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

