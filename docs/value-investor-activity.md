# Value-investor portfolios and activity

## Intention

The Value Investors workspace is an idea-discovery and evidence-checking tool. It answers two narrow
questions:

1. What long US-listed securities did each included institutional manager report at quarter end?
2. Which companies had similar or opposing reported share-count changes across multiple managers?

It does not infer that an investor likes today's price, reveal the original thesis, reproduce a complete
portfolio, or provide a buy/sell recommendation.

## Sources

- [Stockcircle's value-investor directory](https://stockcircle.com/value-investors) is used to discover and
  curate manager names.
- Holdings, values, share counts, reporting dates, and quarter-over-quarter actions use the SEC filing linked
  on each investor card.
- Each profile shows only its largest reported positions. The aggregate activity list is separately calculated
  from material changes across the complete downloaded information tables, so it is not limited to those cards.
- Each current profile also exposes a **Recent moves** table with its largest material share-count changes,
  including selected new positions and exits. The table shows reported shares before and after because weight
  changes alone can be caused by market-price movement.

## Calculation

For the Q2 2026 view, each security's CUSIP and reported share count are compared with the same manager's Q1
2026 filing:

- absent in Q1 and present in Q2: `New`
- more shares in Q2: `Add`
- the same shares: `Hold`
- fewer shares in Q2: `Reduce`
- present in Q1 and absent in Q2: `Exit`

A change enters the aggregated table when the security represented at least 0.25% of that manager's reported
13-F value in either quarter. A company is displayed when at least two included managers generated a material
signal. Buyer and seller totals count managers; quarter-end market values are not treated as transaction values.

## Important limitations

Form 13-F is delayed and point-in-time. It generally omits cash, private holdings, most bonds, ordinary short
positions, and many derivatives. Options and multiple share classes can complicate interpretation. A manager's
firm filing is not necessarily the named person's personal portfolio, especially for Bridgewater, Gotham, GAMCO,
and ValueAct. Price changes can alter portfolio weights even when share counts do not change.

The UI deliberately labels Bridgewater as a systematic macro portfolio rather than conventional value investing.
It also labels institutional firm portfolios instead of presenting every reported position as a personal decision
by the associated investor.

## Updating a quarter

This first version keeps reviewed, dated snapshots in `app/api/gurus/route.ts`. A future updater should download
the current and prior SEC information tables, normalize duplicate CUSIP rows, compare share counts, retain the
materiality rule above, and require a human review before replacing the checked-in snapshot. Stockcircle should
remain a discovery aid rather than the holdings authority.
