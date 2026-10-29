import React from 'react';
import { Badge, Divider, Formula } from '../design/components';
import { BookOpen, Cpu, GitBranch, Users } from 'lucide-react';

/**
 * About page — editorial single-column layout (max 68ch)
 * describing the project, algorithms, and authors.
 */
export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-prose mx-auto px-4 py-10" style={{ maxWidth: '68ch' }}>
      {/* Title Block */}
      <header className="mb-10">
        <h1 className="font-serif text-3xl font-bold text-text-100 tracking-tight leading-snug">
          Parallel Alpha-Beta Search for an Othello Engine
        </h1>
        <p className="text-sm text-text-400 mt-2 leading-relaxed">
          Comparing Root Splitting, Principal Variation Splitting, and the
          Young Brothers Wait Concept.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="brass">University Project</Badge>
          <Badge variant="neutral">C++17</Badge>
          <Badge variant="signal">Parallel Search</Badge>
        </div>
      </header>

      <Divider />

      {/* 1. Project Overview */}
      <section className="mt-8 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-brass-400" />
          <h2 className="font-serif text-lg font-bold text-text-100">
            Project Overview
          </h2>
        </div>
        <p className="text-sm text-text-400 leading-relaxed">
          This project implements and benchmarks three classic strategies for
          parallelising minimax-based game-tree search: <strong className="text-text-100">Root
          Splitting (P1)</strong>, <strong className="text-text-100">Principal Variation
          Splitting (P2)</strong>, and <strong className="text-text-100">Young Brothers Wait
          Concept with work stealing (P3)</strong>. All parallel engines are
          compared against a <strong className="text-text-100">Sequential alpha-beta
          baseline (B2)</strong> to measure speedup, search overhead, and pruning
          efficiency across varying depths, game phases, and thread counts.
        </p>
      </section>

      {/* 2. Algorithms */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-brass-400" />
          <h2 className="font-serif text-lg font-bold text-text-100">
            Algorithms
          </h2>
        </div>

        <div className="space-y-4">
          <AlgoCard
            tag="B2"
            name="Sequential Alpha-Beta"
            desc="Negamax with alpha-beta pruning, iterative deepening, and move ordering. The baseline against which all parallel strategies are measured."
          />
          <AlgoCard
            tag="P1"
            name="Root Splitting"
            desc="The simplest parallel strategy: legal moves at the root are partitioned evenly across P threads. Each thread runs a full sequential search on its subset. Minimal synchronisation but poor load balance at high thread counts."
          />
          <AlgoCard
            tag="P2"
            name="Principal Variation Splitting (PVS)"
            desc="The PV (first) move at every PV-node is searched sequentially to establish a tight window. Remaining moves are searched in parallel with a null-window scout. If a scout re-search is needed, it is done sequentially to preserve correctness."
          />
          <AlgoCard
            tag="P3"
            name="Young Brothers Wait Concept (YBWC)"
            desc="Extends PVS by allowing idle threads to steal work from busy ones. At every PV-node, the eldest (PV) child is searched first; only then are the &ldquo;young brothers&rdquo; eligible for parallel search. A thread pool with per-worker state tracking and cancellation provides fine-grained load balancing."
          />
        </div>
      </section>

      {/* 3. Key Metrics */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-brass-400" />
          <h2 className="font-serif text-lg font-bold text-text-100">
            Key Metrics
          </h2>
        </div>

        <div className="space-y-3">
          <MetricRow
            name="Speedup"
            formula="S_P = \\frac{T_1}{T_P}"
            desc="How many times faster the parallel search is versus sequential."
          />
          <MetricRow
            name="Efficiency"
            formula="E_P = \\frac{S_P}{P}"
            desc="Speedup normalised by thread count. Ideal = 1.0."
          />
          <MetricRow
            name="Search Overhead"
            formula="SO_P = \\frac{N_P}{N_1} - 1"
            desc="Extra nodes explored by the parallel search relative to sequential."
          />
          <MetricRow
            name="Pruning Efficiency"
            formula="\\eta = 1 - \\frac{N_{\\alpha\\beta}}{N_{\\text{minimax}}}"
            desc="Fraction of the full minimax tree pruned by alpha-beta."
          />
          <MetricRow
            name="Effective Branching Factor"
            formula="b^* = N_1^{1/d}"
            desc="Average number of children expanded per node at depth d."
          />
        </div>
      </section>

      <Divider />

      {/* 4. Node Types */}
      <section className="mt-8 mb-8">
        <h2 className="font-serif text-lg font-bold text-text-100 mb-3">
          Node Classification
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <NodeTypeCard type="PV" desc="Principal Variation node — exact value returned, both bounds updated." color="brass" />
          <NodeTypeCard type="CUT" desc="Cut node — beta cutoff, at least one child causes pruning." color="signal" />
          <NodeTypeCard type="ALL" desc="All node — all children searched, no cutoff, value is an upper bound." color="neutral" />
        </div>
      </section>

      <Divider />

      {/* 5. Technology */}
      <section className="mt-8 mb-8">
        <h2 className="font-serif text-lg font-bold text-text-100 mb-3">
          Technology Stack
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <TechItem label="Engine" value="C++17, std::thread, std::atomic" />
          <TechItem label="Build" value="CMake, MinGW GCC 16.2" />
          <TechItem label="Bridge" value="FastAPI, WebSockets, Pydantic" />
          <TechItem label="Frontend" value="React 18, TypeScript, Tailwind CSS" />
          <TechItem label="Animation" value="Framer Motion, CSS 3D transforms" />
          <TechItem label="Charts" value="visx / uPlot" />
        </div>
      </section>

      <Divider />

      {/* 6. Authors */}
      <section className="mt-8 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-brass-400" />
          <h2 className="font-serif text-lg font-bold text-text-100">
            Authors
          </h2>
        </div>
        <p className="text-sm text-text-400 leading-relaxed">
          This project was developed as part of a university course on
          Fundamentals of Artificial Intelligence. Guided by Dr. Hingrajiya.
        </p>
      </section>

      {/* 7. References */}
      <section className="mb-8">
        <h2 className="font-serif text-lg font-bold text-text-100 mb-3">
          References
        </h2>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-text-400 leading-relaxed">
          <li>
            Knuth, D. E., &amp; Moore, R. W. (1975). An Analysis of Alpha-Beta
            Pruning. <em className="text-text-100">Artificial Intelligence</em>, 6(4), 293–326.
          </li>
          <li>
            Marsland, T. A., &amp; Campbell, M. (1982). Parallel Search of
            Strongly Ordered Game Trees. <em className="text-text-100">ACM Computing Surveys</em>, 14(4), 533–551.
          </li>
          <li>
            Feldmann, R. (1993). Game Tree Search on Massively Parallel Systems.
            <em className="text-text-100">PhD Thesis, University of Paderborn</em>.
          </li>
        </ol>
      </section>
    </div>
  );
};

/* ── Helper sub-components ────────────────────────────────── */

const AlgoCard: React.FC<{ tag: string; name: string; desc: string }> = ({
  tag,
  name,
  desc,
}) => (
  <div className="p-3 bg-ink-800/40 border border-ink-700/60 rounded-xl">
    <div className="flex items-center gap-2 mb-1">
      <span className="font-mono text-xs font-bold text-brass-400 bg-ink-950 border border-ink-700 px-1.5 py-0.5 rounded">
        {tag}
      </span>
      <span className="font-serif text-sm font-semibold text-text-100">
        {name}
      </span>
    </div>
    <p className="text-xs text-text-400 leading-relaxed">{desc}</p>
  </div>
);

const MetricRow: React.FC<{ name: string; formula: string; desc: string }> = ({
  name,
  formula,
  desc,
}) => (
  <div className="p-3 bg-ink-800/40 border border-ink-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
    <div className="shrink-0 sm:w-36">
      <span className="text-xs font-semibold text-text-100">{name}</span>
    </div>
    <div className="shrink-0 sm:w-48">
      <Formula math={formula} />
    </div>
    <p className="text-xs text-text-400 leading-relaxed flex-1">{desc}</p>
  </div>
);

const NodeTypeCard: React.FC<{
  type: string;
  desc: string;
  color: 'brass' | 'signal' | 'neutral';
}> = ({ type, desc, color }) => {
  const colorMap = {
    brass: 'border-brass-400/40 text-brass-400',
    signal: 'border-signal/40 text-signal',
    neutral: 'border-text-400/40 text-text-400',
  };
  return (
    <div className="p-3 bg-ink-800/40 border border-ink-700/60 rounded-xl text-center">
      <div
        className={`inline-block font-mono text-sm font-bold border px-2 py-0.5 rounded mb-1.5 ${colorMap[color]}`}
      >
        {type}
      </div>
      <p className="text-xs text-text-400 leading-relaxed">{desc}</p>
    </div>
  );
};

const TechItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="p-2.5 bg-ink-800/40 border border-ink-700/60 rounded">
    <div className="text-xs text-text-400 mb-0.5">{label}</div>
    <div className="text-xs font-mono text-text-100">{value}</div>
  </div>
);

