# Guru filing timing and price context

The Guru pages use public disclosures as evidence of **reported ownership**, not evidence of an investor's
exact transactions. A Form 13-F reports long US-listed holdings as of the end of a calendar quarter and is
typically filed up to 45 days later. It does not disclose the date a manager bought or sold each security,
the manager's cost basis, intraperiod trade prices, rationale, cash, or all non-reportable positions.

## What the UI means

- **As reported** is the quarter and quarter-end date of the disclosed portfolio snapshot.
- **New / Add / Reduce / Exit** is derived from the change in reported share count against the preceding
  filed quarter, where both periods are available. It means the change occurred at some point in that
  quarter; it is not an exact trade date.
- **Approximate price at period end** is disclosed holding value divided by disclosed shares. It is a
  quarter-end market-price approximation, not average unit cost or an execution price.
- **Hold** means the static data is only a snapshot. It must never be read as “the manager bought this in
  that quarter.”

For example, the current Seth Klarman / Baupost ELAN row is a **Hold** in the Q3 2024 snapshot. The app can
show Sep. 30, 2024 and the price implied by that disclosure, but it cannot truthfully show when Baupost first
bought ELAN or its purchase price without a separate, source-supported historical filing analysis.

## Price display and data provider

The application keeps its own transparent price, drawdown, and log-scale board. External ticker links now
open TradingView charts instead of Yahoo Finance. TradingView's hosted chart widgets are convenient for a
clean interactive visual, but they are third-party embeds and disclose the viewer's IP address and the page
URL to TradingView. They do not replace a licensed data API for the application.

If we later replace the backend price-data provider, the practical choices are:

- **Twelve Data** for a modest personal project: it has a free tier and paid plans with real-time US equities,
  EOD history, fundamentals, and technical indicators.
- **Polygon** for a fuller US-market API: its free plan has end-of-day data and two years of history; paid
  individual plans add longer history and delayed or real-time data.
- **TradingView widget only** when the goal is a richer visual chart, not downloadable data or a backend API.

Any provider change should stay behind the existing price-history API route, use an environment variable for
its key, document data latency/licensing, and never place a key in the browser or repository.
