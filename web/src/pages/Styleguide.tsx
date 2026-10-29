import React, { useState } from 'react';
import {
  Button,
  Panel,
  Tabs,
  Stat,
  SegmentedControl,
  Slider,
  Select,
  Badge,
  Divider,
  IconButton,
  Tooltip,
  Popover,
  Dialog,
  Toast,
  Formula,
} from '../design/components';
import { Play, RotateCcw, HelpCircle, Activity, Settings, Cpu } from 'lucide-react';

export const StyleguidePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('components');
  const [segmentVal, setSegmentVal] = useState('p3');
  const [sliderVal, setSliderVal] = useState(8);
  const [dialogOpen, setDialogOpen] = useState(false);

  const tokens = [
    { name: 'ink-950', hex: '#0B0D10', role: 'Page background' },
    { name: 'ink-900', hex: '#12161B', role: 'Panels' },
    { name: 'ink-800', hex: '#181D24', role: 'Raised surfaces' },
    { name: 'ink-700', hex: '#262D36', role: 'Borders' },
    { name: 'jade-900', hex: '#0C3329', role: 'Board base' },
    { name: 'jade-700', hex: '#14513F', role: 'Board squares' },
    { name: 'jade-600', hex: '#1C6A53', role: 'Grid lines' },
    { name: 'obsidian', hex: '#14171B', role: 'Black disc' },
    { name: 'pearl', hex: '#F2EDE4', role: 'White disc' },
    { name: 'brass-400', hex: '#D9A441', role: 'Single accent' },
    { name: 'brass-600', hex: '#A87B26', role: 'Hover / pressed' },
    { name: 'text-100', hex: '#E8E4DA', role: 'Primary text' },
    { name: 'text-400', hex: '#8A919B', role: 'Muted text' },
    { name: 'danger', hex: '#E2574C', role: 'Errors, losing eval' },
    { name: 'signal', hex: '#4FB3A3', role: 'Winning eval, thread activity' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Page Header */}
      <div className="border-b border-ink-700 pb-5">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-text-100">
          Ebon &amp; Ivory Styleguide
        </h1>
        <p className="text-text-400 text-sm mt-1">
          A handcrafted, quiet premium dark theme for parallel alpha-beta Othello.
        </p>
      </div>

      {/* Colour Palette Swatches */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg font-semibold uppercase tracking-wider text-brass-400">
            01. Colour Tokens
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {tokens.map((tok) => (
            <div
              key={tok.name}
              className="bg-ink-900 border border-ink-700 rounded-lg p-3 space-y-2 shadow-sm"
            >
              <div
                className="w-full h-12 rounded border border-ink-700 shadow-inner"
                style={{ backgroundColor: tok.hex }}
              />
              <div>
                <div className="font-mono text-xs font-semibold text-text-100">{tok.name}</div>
                <div className="font-mono text-[11px] text-brass-400">{tok.hex}</div>
                <div className="text-[10px] text-text-400 mt-0.5">{tok.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography Scale */}
      <section className="space-y-4">
        <h2 className="font-serif text-lg font-semibold uppercase tracking-wider text-brass-400">
          02. Typography
        </h2>
        <Panel title="Font Families & Hierarchy">
          <div className="space-y-6">
            <div className="border-b border-ink-700/60 pb-4">
              <span className="text-xs font-mono text-text-400 uppercase tracking-widest block mb-1">
                Headings · Fraunces Serif
              </span>
              <div className="space-y-2">
                <h1 className="font-serif text-2xl font-semibold text-text-100">
                  Young Brothers Wait Concept (YBWC)
                </h1>
                <h2 className="font-serif text-xl font-medium text-text-100">
                  Principal Variation Splitting vs Root Splitting
                </h2>
                <h3 className="font-serif text-base font-medium text-brass-400">
                  Sub-heading section title
                </h3>
              </div>
            </div>

            <div className="border-b border-ink-700/60 pb-4">
              <span className="text-xs font-mono text-text-400 uppercase tracking-widest block mb-1">
                UI Copy · IBM Plex Sans
              </span>
              <p className="text-sm text-text-100 leading-relaxed max-w-2xl">
                The engine is the single source of truth for rules and parallel search. The frontend
                never implements move legality. All communications stream JSON packets across the
                WebSocket bridge.
              </p>
              <p className="text-xs text-text-400 mt-2">
                Muted description text with high contrast meeting WCAG AA requirements.
              </p>
            </div>

            <div>
              <span className="text-xs font-mono text-text-400 uppercase tracking-widest block mb-1">
                Metrics &amp; Numbers · JetBrains Mono (Tabular)
              </span>
              <div className="flex gap-6 font-mono text-sm tabular-nums text-text-100">
                <div>Nodes: <span className="text-brass-400 font-semibold">1,234,567</span></div>
                <div>NPS: <span className="text-signal font-semibold">8,800,000</span></div>
                <div>Time: <span className="text-text-400">140 ms</span></div>
                <div>Value: <span className="text-signal">+12</span></div>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* Component Library */}
      <section className="space-y-4">
        <h2 className="font-serif text-lg font-semibold uppercase tracking-wider text-brass-400">
          03. Components
        </h2>

        {/* Buttons */}
        <Panel title="Buttons & Controls">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary" icon={<Play className="w-4 h-4" />}>
                Primary Move
              </Button>
              <Button variant="secondary" icon={<RotateCcw className="w-4 h-4" />}>
                Undo Move
              </Button>
              <Button variant="ghost" icon={<Activity className="w-4 h-4" />}>
                Ghost Action
              </Button>
              <Button variant="danger">Resign Game</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" variant="secondary">Small</Button>
              <Button size="md" variant="secondary">Medium</Button>
              <Button size="lg" variant="primary">Large Start</Button>
              <IconButton icon={<Settings className="w-4 h-4" />} label="Settings" />
              <IconButton icon={<Cpu className="w-4 h-4" />} label="CPU" variant="ghost" />
            </div>
          </div>
        </Panel>

        {/* Segmented Controls & Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Segmented Controls">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-400 uppercase tracking-wider block mb-2">
                  Parallel Algorithm
                </label>
                <SegmentedControl
                  options={[
                    { value: 'b2', label: 'Sequential α-β' },
                    { value: 'p1', label: 'Root Split' },
                    { value: 'p2', label: 'PVS' },
                    { value: 'p3', label: 'YBWC' },
                  ]}
                  value={segmentVal}
                  onChange={setSegmentVal}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-400 uppercase tracking-wider block mb-2">
                  Thread Allocation (P)
                </label>
                <SegmentedControl
                  options={[
                    { value: '1', label: '1T' },
                    { value: '2', label: '2T' },
                    { value: '4', label: '4T' },
                    { value: '8', label: '8T' },
                  ]}
                  value="4"
                  onChange={() => {}}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Sliders & Selects">
            <div className="space-y-4">
              <Slider
                label="Search Depth Target"
                min={2}
                max={12}
                value={sliderVal}
                onChange={setSliderVal}
                unit="plies"
              />
              <Select
                label="Move Ordering Mode"
                options={[
                  { value: 'full', label: 'Full Ordering (Corner + History + Heuristic)' },
                  { value: 'history', label: 'History Only' },
                  { value: 'none', label: 'None (Unordered)' },
                ]}
              />
            </div>
          </Panel>
        </div>

        {/* Stats, Badges, Tabs */}
        <Panel title="Telemetry & Stat Readouts">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total Nodes" value="1,248,390" delta={{ value: '12%', positive: false }} />
            <Stat label="Throughput" value="8.42" unit="Mnps" delta={{ value: '3.1x', positive: true }} />
            <Stat label="Parallel Splits" value="42" />
            <Stat label="Work Steals" value="17" />
          </div>

          <Divider label="Badges & Node Types" />

          <div className="flex flex-wrap gap-2 items-center mb-4">
            <Badge variant="brass">PV Node</Badge>
            <Badge variant="signal">CUT Node</Badge>
            <Badge variant="neutral">ALL Node</Badge>
            <Badge variant="danger">Beta Cutoff</Badge>
            <Badge size="sm" variant="brass">YBWC-P3</Badge>
          </div>

          <Divider label="Tabs" />
          <Tabs
            tabs={[
              { id: 'components', label: 'Components' },
              { id: 'tokens', label: 'Tokens' },
              { id: 'diagnostics', label: 'Diagnostics' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </Panel>

        {/* Math & Formulas with KaTeX */}
        <Panel title="Mathematical Formulas (KaTeX)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-ink-950 border border-ink-700 rounded text-center">
              <div className="text-xs text-text-400 mb-1">Speedup Ratio</div>
              <Formula math="S_P = \frac{T_1}{T_P}" block />
            </div>
            <div className="p-3 bg-ink-950 border border-ink-700 rounded text-center">
              <div className="text-xs text-text-400 mb-1">Parallel Efficiency</div>
              <Formula math="E_P = \frac{S_P}{P}" block />
            </div>
            <div className="p-3 bg-ink-950 border border-ink-700 rounded text-center">
              <div className="text-xs text-text-400 mb-1">Search Overhead</div>
              <Formula math="SO_P = \frac{N_P}{N_1} - 1" block />
            </div>
          </div>
        </Panel>

        {/* Overlays: Dialog, Tooltips, Toasts */}
        <Panel title="Overlays & Notifications">
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open Game Over Dialog
            </Button>

            <Tooltip content="Waiting for eldest brother before splitting parallel workers">
              <Button variant="ghost" icon={<HelpCircle className="w-4 h-4" />}>
                YBWC Tooltip
              </Button>
            </Tooltip>

            <Popover
              trigger={
                <Button variant="secondary" size="sm">
                  Metrics Popover
                </Button>
              }
              title="Parallel Search Metrics"
            >
              <div className="space-y-2 text-xs text-text-400">
                <p>Speedup measures execution time reduction with P cores.</p>
                <Formula math="E_P = \frac{T_1}{P \cdot T_P}" block />
              </div>
            </Popover>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Toast message="Engine thinking (Depth 8, 4 threads)..." type="info" />
            <Toast message="Legal move placed on d3." type="success" />
            <Toast message="Illegal move attempted on square e2." type="error" />
          </div>
        </Panel>
      </section>

      {/* Modal Dialog Demo */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Game Over — Obsidian Victory"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Rematch
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex justify-around items-center py-4 border-b border-ink-700">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-obsidian border border-ink-700 mx-auto mb-1" />
              <div className="font-serif text-sm font-semibold text-text-100">Black (Human)</div>
              <div className="font-mono text-2xl font-bold text-brass-400">38</div>
            </div>
            <div className="font-serif text-sm text-text-400 uppercase">vs</div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-pearl border border-brass-400 mx-auto mb-1" />
              <div className="font-serif text-sm font-semibold text-text-100">White (YBWC)</div>
              <div className="font-mono text-2xl font-bold text-text-400">26</div>
            </div>
          </div>
          <p className="text-xs text-text-400 leading-relaxed text-center">
            Black wins by 12 discs after 60 total moves. Search finished with 4 threads in 140 ms.
          </p>
        </div>
      </Dialog>
    </div>
  );
};

