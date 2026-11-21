# Investment OS and semiconductor research handoff

This handoff covers the private Investment OS website and the seven-company semiconductor research snapshot through November 21, 2026. Reference market prices are the November 20 regular-session closes in each market.

## Start with the website

| Component | Where to look |
| --- | --- |
| Next.js frontend | The `ai-investor` repository, especially `app/`, `components/` and `app/api/investment-os/`. Read its `README.md` and `AGENTS.md`. |
| FastAPI backend | The sibling `investment-os` repository. Read `docs/agent-handoff.md`, `README.md` and `deploy/macos/README.md`. It owns the data contracts, financial statements, database, research queues and agents. |
| Interactive research page | `ai-investor/public/ai-chip-supply-chain-2026-11-21.html`. Open directly in a browser or serve it through Next.js at `/ai-chip-supply-chain-2026-11-21.html`. The report, calculations and chart data are self-contained. |
| Existing local app | Frontend `http://127.0.0.1:3000`, API `http://127.0.0.1:8000`. The report also appears in Industry Research as `review-2026-11-21`. |
| Local research records | The seven imported ticker dossiers can be inspected in the running Investment OS via `/api/v1/research/companies/{ticker}/latest`. The dated industry review and application records live in the local deployment. |

On the Mac already running Investment OS, start Claude Code with both repositories in scope:

```sh
cd "/Users/kgarg/Developer/AI-investor-local/ai-investor"
claude --add-dir ../investment-os
```

Run `git status --short` in each repository before editing. The application spans two separate repositories and may have in-progress edits. Use the current project documentation and a development environment when testing changes. Next.js, FastAPI, PostgreSQL and configured data providers are needed for the full application. The standalone research HTML can be opened on its own.

The live app also supports **Claude Code** as a local research runner. Use the runner selector where available for a ticker-specific follow-up. Use Claude Code with the repository when the task involves changing the website.

## Research included

- [Nvidia price and valuation bridge](nvidia-price-bridge.md) quantifies October 8 versus November 20, with information known on each date.
- [Full Nvidia report and evidence](nvidia-research-and-sources.txt) contains the updated companion Page text and its eight evidence notes. The original chart figures are represented by their underlying model inputs and tables.
- [Seven-company financial model](financial-model.json) contains 35 annual statement periods, company-specific assumptions, scenarios and direct source URLs. The report's Nvidia section contains the complete DCF inputs and earnings assumptions. The previous close fields `prev` and `priceNov13` refer to November 13, 2026.
- `ai-chip-supply-chain-2026-11-21.html` contains the Minto-style executive recommendation, full Nvidia thesis, six peer theses, token economics and the interactive trend tables. Apply a company and statement via `?ticker=AVGO&statement=flows#financial-title`. Valid statement names are `income`, `balance` and `flows`.

### Model definitions

The JSON's annual row fields are fiscal year, source ID, revenue, gross profit, operating income, net income, cash and equivalents, assets, liabilities, equity, operating cash flow, gross capital purchases, investing cash flow and financing cash flow. Divide financial values by the company's `scale` to recover the displayed units. Calculated free cash flow is operating cash flow minus capital purchases. Nvidia's purchases line includes intangibles. Broadcom's FY2021 balance sheet includes a $27 million preferred dividend obligation after reported liabilities. Samsung and SK hynix quotes are KRX common shares. TSMC is the US-listed ADR.

The bearish, normal and best share-price estimates use normalized earnings at a November 2027 valuation date and exclude dividends. Nvidia's $118.19 figure is a separate current DCF on the November 2026 snapshot. Peer entry screens use the lower of normal value divided by 1.15 and bearish value divided by 0.65. Nvidia's entry screen takes a 20% discount to its current DCF. Imported dossier scenarios have illustrative display weights because the native schema requires them. Use the scenario prices and underlying evidence when evaluating the thesis.

## Start a Claude conversation

For research only, upload the HTML, JSON, the Nvidia report text and the price-bridge text in a Claude chat or Project. Open the HTML in your browser for the charts. Claude's document upload extracts text. For changes to the application, start Claude Code with access to the two local repositories.

Suggested opening prompt:

> Read `docs/claude-handoff/README.md` and the linked research files. Use the November 21 snapshot as the baseline for my next request. Start with what has changed since the baseline, using current filings, earnings calls, regular-session closes, and applicable policy. Audit the Nvidia October-to-November price bridge and distinguish reported facts, management guidance and modeled outcomes. Keep the three cases and the current Nvidia DCF on explicit dates. When you compare inference economics, report dollars per million input, cached input and output tokens, or state the input/output mix when the benchmark provides only combined throughput. Lead with the conclusion, then supporting evidence in Barbara Minto's pyramid structure. For website work, inspect both repositories and preserve work in progress. My next task is: [describe what you want Claude to do].

For a Claude chat, say “Read the attached handoff files” instead of referring to the repository path.

## Verification

For a report change, open the HTML, confirm all seven ticker options and five annual periods per ticker, and switch among the three financial statement tabs. Verify chart toggles, the relative links, the sign convention on capex and free cash flow, and recalculated targets against their underlying assumptions. In the running app, `/health` on port 8000 should respond, and the report should load on port 3000. The frontend and backend READMEs contain the repo-specific validation commands. Portfolio holdings, live database contents, provider credentials, configuration secrets and unrelated workspace research are outside this handoff.
