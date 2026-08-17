# Financial statement views and year-over-year display

## Intention

The Financials workspace keeps the complete sourced SEC statement data while allowing the investor to
reduce the screen to the line items relevant to the current question. Visibility settings affect only the
presentation. They never delete financial facts, change calculations, call a model, or alter saved research.

Open the workspace at `http://127.0.0.1:3000/financials`.

## Row views

- **Core** is the default concise view. It includes the principal scale, profitability, balance-sheet,
  cash-generation, stock-compensation, and capital-return lines.
- **All** shows every normalized metric available for the selected company and statement.
- **Custom** shows only checked rows. Open **Customize** to search the active statement, select or clear the
  matching rows, and configure the trend chart.
- **Restore defaults** returns to Core rows, Values + YoY, and the default revenue, operating-income,
  net-income, and free-cash-flow trend series.

Custom row and chart choices are stored in browser `localStorage` under a versioned application key. They
contain only metric names and display preferences—not holdings, account values, secrets, or company data.
The choices apply across tickers in the same browser. A different browser or cleared site data starts with
the defaults.

## Display modes

- **Values** shows the normalized annual SEC values only.
- **Values + YoY** shows each value with its year-over-year change directly underneath in brackets, such as
  `(YoY +18.4%)`.
- **YoY only** emphasizes the annual percentages while keeping the current filing linked from each cell.

For a metric value `V` and the immediately preceding fiscal year's value `P`:

```text
YoY change = V / P - 1
```

The calculation is shown only when both adjacent annual observations exist and `P` is positive. If the
prior value is zero or negative, the dashboard shows `N/M` (not meaningful) because a conventional growth
percentage can reverse the economic interpretation. A missing or non-adjacent comparison shows a dash.
Positive and negative colors indicate mathematical direction only. For example, a positive expense change
is not automatically favorable.

The oldest visible year may have no YoY figure because the requested SEC window does not include an earlier
comparison period.

## Trend selection

Clicking any statement row name adds or removes that row from the chart. Selected rows are highlighted.
Customize offers the same controls and permits up to five trend series. One chart contains one unit: if a
per-share or share-count row is clicked while currency rows are selected, that row starts a new chart. This
prevents incomparable axes. The table's Values/YoY mode does not convert the chart into a percentage chart.

Revenue and Diluted EPS can extend beyond the actual SEC years using available annual analyst consensus.
Actual lines are solid. Consensus averages are dashed, estimate years end in `E`, and low/high ranges appear
at the forecast points. Other rows remain historical rather than being mechanically extrapolated.

## Implementation map

- `components/FinancialStatementsWorkspace.tsx`: row/display controls, local preference persistence,
  custom metric panel, row-driven chart selection, forecast rendering, and consensus cards.
- `app/api/investment-os/forward-estimates/route.ts`: validated server-side consensus endpoint.
- `lib/forward-estimates.ts`: pure normalization and annual chart-point selection.
- `lib/financial-statements.ts`: Core/default definitions and pure visibility, YoY, CAGR, lookup, and
  formatting calculations.
- `lib/financial-statements.test.ts`: deterministic view and YoY edge-case tests.

## Verification and handoff

After changing this feature, run:

```bash
npm run lint
npm test
npm run build
```

For a live check, use a company with positive growth, a missing annual observation, and a line that crosses
zero. Confirm Core/All/Custom, search, Select shown, Clear shown, all three display modes, trend selection,
and preference restoration after a page reload. Further agents should keep YoY logic in the pure helper and
must not silently replace `N/M` with a percentage for non-positive comparison bases.
