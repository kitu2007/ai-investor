# Price history board

## Intention

The price history board gives the investor a transparent view of where a stock sits within its own price
history before interpreting momentum, valuation, or a model-generated thesis. It is a deterministic tool:
loading or interacting with the board never calls Codex, Claude Code, or an LLM API.

Open it at `http://127.0.0.1:3000/prices` or choose **Price History** in the top navigation.

## User controls

- Enter a ticker and choose **Load**.
- Select All, 10Y, 5Y, 2Y, 1Y, 6M, or 3M. All uses weekly observations to keep very long histories
  readable and below the backend import limit; all shorter windows use daily observations.
- Select **Normal** to compare absolute dollar movements or **Log** to compare percentage movements. On a
  logarithmic price chart, equal vertical distances mean equal percentage changes.
- Move across any chart to inspect the same date in the adjusted-price, drawdown, and drawup panels.

## Calculations

Every selected range is calculated independently, starting with the first valid observation in that
window. Let `P(t)` be the adjusted close on date `t`.

```text
running high(t) = max(P(0), ..., P(t))
drawdown(t)     = P(t) / running high(t) - 1

running low(t)  = min(P(0), ..., P(t))
drawup(t)       = P(t) / running low(t) - 1
```

Drawdown is zero at a new high and otherwise negative. Drawup is zero at a new low and otherwise positive.
Because both anchors restart when the selected range changes, a 3-month drawdown can differ from the
drawdown visible on the 10-year board. “Maximum drawdown” is the most negative displayed drawdown.
“Maximum drawup” is the largest displayed drawup.

Price return is the change from the first to last adjusted close in the selected range. These are price
observations and arithmetic calculations, not estimates, forecasts, or investment recommendations.

## Data path and design

```text
Price History UI
  -> Next.js price-history route
  -> Yahoo Finance server-side adapter
  -> normalize, sort, and deduplicate adjusted closes
  -> calculate running highs/lows, drawdown, drawup, and summary
  -> persist provider-labelled observations in local Investment OS PostgreSQL
  -> return the chart payload to the browser
```

The Yahoo adapter remains server-only so provider calls are not exposed in browser code. The API validates
the ticker and accepted range. Invalid dates, non-finite closes, zero/negative closes, and duplicate dates
are removed before calculations. Existing market persistence is reused, retaining the provider name,
source URL, retrieval metadata, and date-level idempotency.

The UI uses repository-native SVG charts rather than adding a charting dependency. The price chart applies
the logarithm only for screen coordinates; cards and hover values always show the original adjusted close.
Drawdown and drawup use separate aligned panels because large long-run gains would otherwise compress the
negative drawdown series.

## Source and limitations

- Source: Yahoo Finance adjusted close, via the existing `yahoo-finance2` dependency.
- Adjusted close accounts for corporate actions and may differ from the historical raw closing price.
- All-history data is weekly; a shorter range must be selected to inspect daily movement.
- The board does not reconstruct intraday drawdowns, peak-to-trough episodes between closes, or inflation-
  adjusted returns.
- Provider corrections can change past observations. The board shows the provider response retrieved at
  load time and saves those public observations locally.

## Implementation map

- `app/prices/page.tsx`: public page route and shared navigation shell.
- `components/PriceHistoryWorkspace.tsx`: controls, summary cards, synchronized SVG charts, and definitions.
- `app/api/investment-os/price-history/route.ts`: validated server-side price-history endpoint.
- `lib/investment-os-market.ts`: Yahoo Finance fetch and backend persistence adapter.
- `lib/price-history.ts`: pure range, normalization, drawdown/drawup, summary, and formatting helpers.
- `lib/price-history.test.ts`: deterministic calculation and calendar-window tests.

## Verification and handoff

After changing the board, run:

```bash
npm run lint
npm test
npm run build
```

For a live check, start the sibling backend's documented stack and load `/prices`. Verify at least one short
daily window and All, then switch Normal/Log and move across all three charts. Further agents should keep
the calculations in the pure helper, preserve adjusted-close/source labels, avoid adding model calls, and
add tests before changing the definitions.
