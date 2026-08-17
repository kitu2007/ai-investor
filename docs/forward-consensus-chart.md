# Forward consensus in the financial chart

## Purpose

Historical SEC statements explain what happened. The forward layer makes visible what analysts currently
expect, how widely they disagree, and whether estimates are moving. It does not claim to know the future.

The Financials workspace displays four consensus horizons when available:

- current quarter;
- next quarter;
- current fiscal year; and
- next fiscal year.

Each card shows average, low, and high Revenue and Diluted EPS estimates, YoY growth, analyst counts, the
30-day EPS estimate change, and upward/downward revisions. The source and retrieval context remain visible.

## Chart behavior

The chart x-axis begins with annual SEC actuals and, for supported rows, continues into estimate years.

- Solid line and filled dots: sourced SEC annual actuals.
- Dashed line and hollow dots: analyst consensus averages.
- Translucent vertical range: analyst low to high estimates.
- `E` after a year: estimate, not an actual result.

Only Revenue and Diluted EPS are extended because those are the independently supplied consensus series.
Operating income, net income, free cash flow, assets, and other rows still chart their sourced history, but
the application does not invent their future values from a constant margin or a model. Clicking a statement
row directly adds or removes it. Selecting a row with a different unit replaces the current chart selection
so a single y-axis remains meaningful.

Quarterly estimates are shown in the forward cards rather than appended to the annual line, because mixing
quarterly flows with full-year annual values on one axis would be misleading.

## Source and methodology

The server uses the checked-in `yahoo-finance2` dependency and Yahoo Finance's `earningsTrend` response. It
normalizes public analyst estimates into the application contract. No API key, LLM call, or paid model is
used. The feed can identify a GAAP or non-GAAP methodology; the UI displays that label.

This is an unofficial free consensus source, not a licensed institutional dataset. Coverage can be missing,
delayed, revised, or inconsistent. Company-issued guidance is a separate evidence class and is not currently
normalized by this feed. The UI therefore says “analyst consensus” and never relabels it as management
guidance.

## Assumptions exposed

Consensus is shown with:

- average versus low/high range;
- number of contributing analysts;
- YoY revenue and EPS growth;
- current EPS estimate versus 30 days earlier; and
- counts of upward and downward revisions.

No hidden margin, share-count, or constant-growth assumption is applied to unsupported metrics. A future
company-guidance importer can add official ranges later, but should keep management guidance, analyst
consensus, and investor scenarios visually separate.

## Implementation and testing

- `app/api/investment-os/forward-estimates/route.ts`: ticker validation and server-side provider call.
- `lib/investment-os-market.ts`: server-only Yahoo `earningsTrend` adapter.
- `lib/forward-estimates.ts`: normalized contract and annual Revenue/EPS selectors.
- `lib/forward-estimates.test.ts`: ordering, methodology, range, and supported-metric tests.
- `components/FinancialStatementsWorkspace.tsx`: cards, assumptions, row clicks, axes, actual/estimate styles.

Verification commands:

```bash
npm run lint
npm test
npm run build
```

For a live check, load a covered ticker and verify all four cards. Click Revenue and confirm two dashed annual
estimate points. Click Operating income and confirm no forecast is fabricated. Click Diluted EPS and confirm
the chart switches to a per-share y-axis with EPS estimates.
