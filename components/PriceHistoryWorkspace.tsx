"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Gauge,
  LineChart,
  LoaderCircle,
} from "lucide-react";
import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  PRICE_HISTORY_RANGES,
  formatPrice,
  formatPricePercent,
  type DerivedPricePoint,
  type PriceHistoryRange,
  type PriceHistoryResponse,
  type PriceScale,
} from "@/lib/price-history";
import { companyContextForTicker } from "@/lib/company-context";

const RANGE_LABELS: Record<PriceHistoryRange, string> = {
  all: "All",
  "10y": "10Y",
  "5y": "5Y",
  "2y": "2Y",
  "1y": "1Y",
  "6m": "6M",
  "3m": "3M",
};

const CHART = {
  width: 1100,
  height: 320,
  left: 82,
  right: 24,
  top: 22,
  bottom: 38,
};

function dateValue(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function xCoordinates(points: DerivedPricePoint[]) {
  const first = dateValue(points[0].date);
  const last = dateValue(points[points.length - 1].date);
  const span = last - first || 1;
  return points.map(
    (point) =>
      CHART.left +
      ((dateValue(point.date) - first) * (CHART.width - CHART.left - CHART.right)) / span,
  );
}

function hoverIndex(
  event: ReactPointerEvent<SVGRectElement>,
  points: DerivedPricePoint[],
): number {
  const bounds = event.currentTarget.getBoundingClientRect();
  const pointer = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * CHART.width;
  const ratio = Math.max(
    0,
    Math.min(1, (pointer - CHART.left) / (CHART.width - CHART.left - CHART.right)),
  );
  const first = dateValue(points[0].date);
  const last = dateValue(points[points.length - 1].date);
  const target = first + ratio * (last - first);
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const candidate = Math.abs(dateValue(point.date) - target);
    if (candidate < distance) {
      nearest = index;
      distance = candidate;
    }
  });
  return nearest;
}

function ChartDates({ points }: { points: DerivedPricePoint[] }) {
  const middle = points[Math.floor((points.length - 1) / 2)];
  return (
    <>
      <text x={CHART.left} y={CHART.height - 11} fill="#6b7280" fontSize="10">
        {shortDate(points[0].date)}
      </text>
      <text
        x={CHART.width / 2}
        y={CHART.height - 11}
        textAnchor="middle"
        fill="#6b7280"
        fontSize="10"
      >
        {shortDate(middle.date)}
      </text>
      <text
        x={CHART.width - CHART.right}
        y={CHART.height - 11}
        textAnchor="end"
        fill="#6b7280"
        fontSize="10"
      >
        {shortDate(points[points.length - 1].date)}
      </text>
    </>
  );
}

function PriceChart({
  points,
  scale,
  selectedIndex,
  onSelect,
}: {
  points: DerivedPricePoint[];
  scale: PriceScale;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}) {
  const xs = xCoordinates(points);
  const transformed = points.map((point) =>
    scale === "log" ? Math.log(point.close) : point.close,
  );
  const rawMinimum = Math.min(...transformed);
  const rawMaximum = Math.max(...transformed);
  const padding = Math.max((rawMaximum - rawMinimum) * 0.08, Math.abs(rawMaximum) * 0.01, 0.01);
  const minimum = rawMinimum - padding;
  const maximum = rawMaximum + padding;
  const span = maximum - minimum || 1;
  const y = (value: number) =>
    CHART.top + ((maximum - value) * (CHART.height - CHART.top - CHART.bottom)) / span;
  const path = transformed
    .map((value, index) => `${index === 0 ? "M" : "L"}${xs[index].toFixed(2)},${y(value).toFixed(2)}`)
    .join(" ");
  const selected = selectedIndex == null ? null : points[selectedIndex];

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Adjusted price history</h2>
          <p className="mt-0.5 text-[10px] text-gray-500">
            {scale === "log"
              ? "Log scale: equal vertical distances represent equal percentage changes."
              : "Normal scale: equal vertical distances represent equal dollar changes."}
          </p>
        </div>
        {selected ? (
          <div className="text-right text-xs tabular-nums">
            <span className="font-semibold text-blue-300">{formatPrice(selected.close)}</span>
            <span className="ml-2 text-gray-500">{shortDate(selected.date)}</span>
          </div>
        ) : (
          <div className="text-[10px] text-gray-600">Move across the chart to inspect a date</div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-[320px] w-full touch-none"
        role="img"
        aria-label={`Adjusted closing price on a ${scale === "log" ? "logarithmic" : "normal"} scale`}
      >
        <defs>
          <linearGradient id="price-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const gridY = CHART.top + fraction * (CHART.height - CHART.top - CHART.bottom);
          const transformedValue = maximum - fraction * span;
          const labelValue = scale === "log" ? Math.exp(transformedValue) : transformedValue;
          return (
            <g key={fraction}>
              <line
                x1={CHART.left}
                x2={CHART.width - CHART.right}
                y1={gridY}
                y2={gridY}
                stroke="#1f2937"
              />
              <text x={CHART.left - 10} y={gridY + 4} textAnchor="end" fill="#6b7280" fontSize="10">
                {formatPrice(labelValue)}
              </text>
            </g>
          );
        })}
        <path
          d={`${path} L${xs[xs.length - 1]},${CHART.height - CHART.bottom} L${xs[0]},${CHART.height - CHART.bottom} Z`}
          fill="url(#price-area)"
        />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        {selected && selectedIndex != null ? (
          <g>
            <line
              x1={xs[selectedIndex]}
              x2={xs[selectedIndex]}
              y1={CHART.top}
              y2={CHART.height - CHART.bottom}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
            <circle
              cx={xs[selectedIndex]}
              cy={y(transformed[selectedIndex])}
              r="4"
              fill="#dbeafe"
              stroke="#2563eb"
              strokeWidth="2"
            />
          </g>
        ) : null}
        <ChartDates points={points} />
        <rect
          x={CHART.left}
          y={CHART.top}
          width={CHART.width - CHART.left - CHART.right}
          height={CHART.height - CHART.top - CHART.bottom}
          fill="transparent"
          onPointerMove={(event) => onSelect(hoverIndex(event, points))}
          onPointerLeave={() => onSelect(null)}
        />
      </svg>
    </section>
  );
}

function PercentHistoryChart({
  points,
  kind,
  selectedIndex,
  onSelect,
}: {
  points: DerivedPricePoint[];
  kind: "drawdown" | "drawup";
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}) {
  const drawdown = kind === "drawdown";
  const values = points.map((point) => point[kind]);
  const xs = xCoordinates(points);
  const rawMinimum = Math.min(0, ...values);
  const rawMaximum = Math.max(0, ...values);
  const minimum = drawdown ? Math.min(rawMinimum, -0.01) : 0;
  const maximum = drawdown ? 0 : Math.max(rawMaximum, 0.01);
  const span = maximum - minimum || 1;
  const y = (value: number) =>
    CHART.top + ((maximum - value) * (CHART.height - CHART.top - CHART.bottom)) / span;
  const zero = y(0);
  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${xs[index].toFixed(2)},${y(value).toFixed(2)}`)
    .join(" ");
  const color = drawdown ? "#f87171" : "#34d399";
  const gradientId = drawdown ? "drawdown-area" : "drawup-area";
  const selected = selectedIndex == null ? null : points[selectedIndex];

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {drawdown ? "Drawdown from running high" : "Drawup from running low"}
          </h2>
          <p className="mt-0.5 text-[10px] text-gray-500">
            {drawdown
              ? "How far each close is below the highest prior close in this window."
              : "How far each close is above the lowest prior close in this window."}
          </p>
        </div>
        {selected ? (
          <div className="text-right text-xs tabular-nums">
            <span className={drawdown ? "font-semibold text-red-300" : "font-semibold text-emerald-300"}>
              {formatPricePercent(selected[kind])}
            </span>
            <span className="ml-2 text-gray-500">{shortDate(selected.date)}</span>
          </div>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-[260px] w-full touch-none"
        role="img"
        aria-label={drawdown ? "Price drawdown from the running high" : "Price drawup from the running low"}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={drawdown ? "0.05" : "0.3"} />
            <stop offset="100%" stopColor={color} stopOpacity={drawdown ? "0.32" : "0.04"} />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const gridY = CHART.top + fraction * (CHART.height - CHART.top - CHART.bottom);
          const label = maximum - fraction * span;
          return (
            <g key={fraction}>
              <line
                x1={CHART.left}
                x2={CHART.width - CHART.right}
                y1={gridY}
                y2={gridY}
                stroke="#1f2937"
              />
              <text x={CHART.left - 10} y={gridY + 4} textAnchor="end" fill="#6b7280" fontSize="10">
                {(label * 100).toFixed(Math.abs(label) < 0.1 ? 1 : 0)}%
              </text>
            </g>
          );
        })}
        <path
          d={`${path} L${xs[xs.length - 1]},${zero} L${xs[0]},${zero} Z`}
          fill={`url(#${gradientId})`}
        />
        <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {selected && selectedIndex != null ? (
          <g>
            <line
              x1={xs[selectedIndex]}
              x2={xs[selectedIndex]}
              y1={CHART.top}
              y2={CHART.height - CHART.bottom}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
            <circle
              cx={xs[selectedIndex]}
              cy={y(values[selectedIndex])}
              r="4"
              fill="#f9fafb"
              stroke={color}
              strokeWidth="2"
            />
          </g>
        ) : null}
        <ChartDates points={points} />
        <rect
          x={CHART.left}
          y={CHART.top}
          width={CHART.width - CHART.left - CHART.right}
          height={CHART.height - CHART.top - CHART.bottom}
          fill="transparent"
          onPointerMove={(event) => onSelect(hoverIndex(event, points))}
          onPointerLeave={() => onSelect(null)}
        />
      </svg>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone = "text-white",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-gray-500">{note}</div>
    </article>
  );
}

async function jsonRequest<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Could not load price history.");
  return body;
}

export default function PriceHistoryWorkspace({ initialTicker = "NVDA" }: { initialTicker?: string }) {
  // This is supplied by the server page so server and client render the same
  // first ticker for a direct /prices?ticker=... link.
  const [ticker, setTicker] = useState(initialTicker);
  const [range, setRange] = useState<PriceHistoryRange>("10y");
  const [scale, setScale] = useState<PriceScale>("linear");
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const requestSequence = useRef(0);

  const loadHistory = useCallback(async (requestedTicker: string, requestedRange: PriceHistoryRange) => {
    const normalized = requestedTicker.trim().toUpperCase();
    if (!normalized) return;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");
    setSelectedIndex(null);
    try {
      const result = await jsonRequest<PriceHistoryResponse>(
        `/api/investment-os/price-history?ticker=${encodeURIComponent(normalized)}` +
          `&range=${encodeURIComponent(requestedRange)}`,
      );
      if (sequence !== requestSequence.current) return;
      setData(result);
      setTicker(result.ticker);
      setRange(result.range);
    } catch (reason) {
      if (sequence !== requestSequence.current) return;
      setError(reason instanceof Error ? reason.message : "Could not load price history.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(initialTicker, "10y"), 0);
    return () => window.clearTimeout(timer);
  }, [initialTicker, loadHistory]);

  function submitTicker(event: FormEvent) {
    event.preventDefault();
    const normalized = ticker.trim().toUpperCase();
    if (normalized) {
      window.history.replaceState(null, "", `/prices?ticker=${encodeURIComponent(normalized)}`);
    }
    void loadHistory(ticker, range);
  }

  function chooseRange(nextRange: PriceHistoryRange) {
    setRange(nextRange);
    const normalized = ticker.trim().toUpperCase();
    if (normalized) {
      window.history.replaceState(null, "", `/prices?ticker=${encodeURIComponent(normalized)}`);
    }
    void loadHistory(ticker, nextRange);
  }

  const summary = data?.summary;
  const loadedRange = data ? RANGE_LABELS[data.range] : RANGE_LABELS[range];
  const companyContext = companyContextForTicker(ticker);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-gray-950">
      <header className="border-b border-gray-800 bg-gradient-to-r from-blue-500/[0.07] via-gray-950 to-emerald-500/[0.05] px-6 py-5">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">
              <LineChart size={13} /> Model-free price history
            </div>
            <h1 className="mt-1.5 text-xl font-semibold text-white">
              Price, drawdown, and recovery board
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
              Compare normal and logarithmic adjusted-price charts across multiple horizons, then inspect
              losses from running highs and gains from running lows. No LLM or API-key spend is involved.
            </p>
          </div>
          <form onSubmit={submitTicker} className="flex items-center gap-2">
            <input
              value={ticker}
              onChange={(event) =>
                setTicker(
                  event.target.value.toUpperCase().replace(/[^A-Z0-9.^-]/g, "").slice(0, 16),
                )
              }
              aria-label="Company ticker"
              className="w-28 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-bold uppercase text-blue-200 outline-none focus:border-blue-400"
            />
            <button
              disabled={loading || !ticker.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {loading ? <LoaderCircle size={13} className="animate-spin" /> : <LineChart size={13} />}
              Load
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 px-6 py-5">
        {companyContext ? (
          <section className="rounded-xl border border-blue-400/15 bg-blue-400/[0.06] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-blue-100">
                  {companyContext.ticker} · {companyContext.name}
                </h2>
                <p className="mt-1 max-w-4xl text-xs leading-5 text-gray-300">{companyContext.description}</p>
                {companyContext.sector ? <p className="mt-1 text-[11px] text-gray-500">Sector: {companyContext.sector}</p> : null}
              </div>
              <a
                href={`https://www.tradingview.com/symbols/${encodeURIComponent(companyContext.ticker)}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-300 underline underline-offset-2"
              >
                TradingView chart <ExternalLink size={12} />
              </a>
            </div>
          </section>
        ) : null}

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Price history range">
            {PRICE_HISTORY_RANGES.map((item) => (
              <button
                key={item}
                onClick={() => chooseRange(item)}
                disabled={loading}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  range === item
                    ? "bg-blue-600 text-white"
                    : "border border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-600 hover:text-white"
                }`}
              >
                {RANGE_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 p-1" aria-label="Price scale">
            {(["linear", "log"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setScale(item)}
                className={`rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  scale === item ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {item === "linear" ? "Normal" : "Log"}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-900/70 bg-red-950/25 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="grid h-80 place-items-center rounded-xl border border-gray-800 bg-gray-900/30 text-xs text-gray-500">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={15} className="animate-spin" /> Loading adjusted price history…
            </span>
          </div>
        ) : null}

        {data && summary ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                label="Latest adjusted close"
                value={formatPrice(summary.latestClose)}
                note={`${shortDate(summary.endDate)} · ${data.interval === "1wk" ? "weekly" : "daily"} observations`}
                tone="text-blue-200"
              />
              <SummaryCard
                label={`${loadedRange} price return`}
                value={formatPricePercent(summary.totalReturn)}
                note={`${formatPrice(summary.startClose)} on ${shortDate(summary.startDate)}`}
                tone={summary.totalReturn >= 0 ? "text-emerald-300" : "text-red-300"}
              />
              <SummaryCard
                label="Current drawdown"
                value={formatPricePercent(summary.currentDrawdown)}
                note={`Worst in this window: ${formatPricePercent(summary.maximumDrawdown)}`}
                tone="text-red-300"
              />
              <SummaryCard
                label="Current drawup"
                value={formatPricePercent(summary.currentDrawup)}
                note={`Largest in this window: ${formatPricePercent(summary.maximumDrawup)}`}
                tone="text-emerald-300"
              />
              <SummaryCard
                label="Window high / low"
                value={`${formatPrice(summary.periodHigh)} / ${formatPrice(summary.periodLow)}`}
                note={`${data.points.length.toLocaleString()} sourced observations`}
              />
            </div>

            <PriceChart
              points={data.points}
              scale={scale}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
            <div className="grid gap-5 xl:grid-cols-2">
              <PercentHistoryChart
                points={data.points}
                kind="drawdown"
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
              />
              <PercentHistoryChart
                points={data.points}
                kind="drawup"
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
              />
            </div>

            <section className="grid gap-3 rounded-xl border border-gray-800 bg-gray-900/35 p-4 md:grid-cols-3">
              <div className="flex gap-3">
                <ArrowDownToLine size={15} className="mt-0.5 shrink-0 text-red-300" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-200">Drawdown definition</h3>
                  <p className="mt-1 text-[10px] leading-4 text-gray-500">
                    Adjusted close ÷ running high − 1. Zero means a new high; negative values show the
                    decline from the highest earlier close in the selected window.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <ArrowUpFromLine size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-200">Drawup definition</h3>
                  <p className="mt-1 text-[10px] leading-4 text-gray-500">
                    Adjusted close ÷ running low − 1. Zero marks a new low; positive values show the rise
                    from the lowest earlier close in the selected window.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Gauge size={15} className="mt-0.5 shrink-0 text-blue-300" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-200">Source and frequency</h3>
                  <p className="mt-1 text-[10px] leading-4 text-gray-500">
                    Adjusted closes account for corporate actions. All uses weekly observations for a
                    readable full-history chart; every shorter window uses daily observations.
                  </p>
                  <a
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    {data.source} <ExternalLink size={9} />
                  </a>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
