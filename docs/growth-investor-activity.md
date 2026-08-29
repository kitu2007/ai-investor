# Growth investor portfolios and company aggregation

## Purpose

The Growth Investors workspace complements the Value Investors workspace. It answers two narrower questions:

1. What do several distinct, active growth managers currently disclose in their largest US-listed long positions?
2. Which companies appear across those displayed holdings, and where did multiple managers report adding or reducing shares in the latest quarter?

It does **not** claim that every manager uses the same definition of growth, that a reported position is still held today, or that an SEC filing reveals the manager's thesis.

## Included managers

The first curated roster is:

- Cathie Wood — ARK Investment Management
- Chase Coleman — Tiger Global Management
- Pat Dorsey — Dorsey Asset Management
- Terry Smith — Fundsmith LLP
- Polen Capital Management

These names were discovered from the [Stockcircle growth-investor directory](https://stockcircle.com/growth-investors). Stockcircle is not used as the source for displayed holdings or transactions. Historical Tiger Management, Scion, and Point72 were not included in this first growth-only view because they are respectively historical, contrarian/multi-style, or multi-strategy and would make the category less coherent.

## Primary data and calculations

All displayed positions come from official SEC Form 13F-HR filings for the quarter ended June 30, 2026. Recent activity compares the reported share count in that filing with the quarter ended March 31, 2026.

- `New`: current share count is positive and the prior filing has no matching CUSIP.
- `Add`: current share count is greater than the prior share count.
- `Reduce`: current share count is lower than the prior share count.
- `Hold`: reported share counts are equal.
- `Exit`: the prior CUSIP is absent from the current filing.

Portfolio weights are calculated as the position's reported value divided by the filing's reported information-table value. Values and shares are rounded for presentation in the UI.

The company aggregator has two independent signals:

- **Top-10 owners** counts managers for whom the security appears in the ten displayed largest 13-F positions. It does not imply that another manager does not own the security outside its displayed top ten.
- **Buyers and sellers** counts manager-level share-count directions in the curated recent-moves set. Counts are managers, not dollars, conviction, or trade frequency.

## Important limitations

Form 13F is delayed and incomplete. It generally does not show cash, private funds, ordinary short positions, exact trade dates or prices, or the investment rationale. It can omit non-US-listed ordinary shares, which is particularly important for Fundsmith. Tiger Global's private investments are outside this view, and ARK's manager-level filing combines reportable securities across strategies.

Raw share-count comparisons can also be distorted by stock splits, mergers, conversions, security-class changes, manager reorganizations, client flows, or mandate changes. A broad set of reductions may reflect portfolio-level effects rather than a bearish view on every company. Always inspect the linked filing and corporate actions before interpreting an unusually large change.

## UI and API

- `/growth-investors` shows each manager's style, filing source, top holdings, and recent reported moves.
- `/growth-investors/companies` is the separate searchable company aggregator.
- `/api/growth-investors` returns roster summaries.
- `/api/growth-investors?id=<id>` returns a full profile.
- `/api/growth-investors?view=companies` returns derived company overlap and activity.

The pages are deterministic and do not call an LLM or paid market-data API.

## Updating the data

For each new quarter:

1. Confirm the manager remains active and identify the latest original (not amended unless required) 13F filing in SEC EDGAR.
2. Download the current and preceding information tables using an SEC-compliant user agent.
3. Match positions by CUSIP, compare share counts, and calculate weights from reported filing values.
4. Investigate corporate actions for large or mechanically suspicious changes.
5. Update filing dates, links, position data, and methodology notes together.
6. Run the API tests, lint, and production build before relying on the UI.

This update should remain a deliberate research-data refresh; it should not become an automated trading signal.
