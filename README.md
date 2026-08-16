# Investment OS workspace

This private Next.js application is the local, non-technical workspace for Investment OS. It connects to
the FastAPI backend in the sibling `investment-os` directory and separates two kinds of work:

- **Signals** fetch daily ticker and SPY prices, then calculate moving averages, RSI, MACD,
  drawdown, momentum, and relative strength without an LLM. The same provider-labelled observations are
  persisted in the local backend with source URL, retrieval time, and idempotent date keys. Signals do not
  read the question or create a chat response.
- **Ask** sends one direct question to the selected local Codex or Claude Code runner. Enter submits Ask;
  Shift+Enter adds a new line. Each answer has cited claims and sources, is saved locally as JSON and
  Markdown, and reappears in the ticker's chat history. A running question can be cancelled.
- **Request Codex/Claude Code** sends the question and authoritative technical snapshot to the selected
  local runner, which creates a validated, saved, multi-perspective research dossier using the Mac's
  existing account sign-in. No project API key is required. The first click opens a review step; nothing
  is queued until **Start analysis** is pressed. Queued or running requests can be cancelled.

The UI shows the dossier's synthesis, bear/base/bull scenarios, independent views, disagreements, and
sources. Choose **Read full dossier** for the complete Evidence, Valuation, Bear, Buffett, Munger,
Fisher, Asymmetric Growth, Technical/Momentum, and Macro/Industry reasoning. Each detailed view includes
cited claims, risks, invalidation conditions, and unresolved questions. The exact saved Markdown can be
opened or copied from that reader. Reports remain local and outside Git.

The top navigation's **Financials** dashboard shows five, ten, fifteen, or twenty years of normalized
annual income statements, balance sheets, cash-flow statements, and calculated free cash flow. It uses
stored official SEC XBRL facts, links every available value to its filing, preserves restatements, and
leaves unavailable facts blank rather than estimating them. **Refresh SEC data** is an explicit public
data fetch; simply opening the dashboard is a local, model-free read.

The top navigation also includes **Industry Research**. It renders the local portfolio policy, AI
infrastructure, quantum-computing, biotech/AI-medicine, and dated review Markdown files. Its search returns
matching passages across the whole local library. Reading and searching these files is deterministic and
does not call a model or require an API key. The backend exposes only an explicit document allowlist rather
than accepting arbitrary local paths.

The **Decision Tools** workspace turns the latest evidence and portfolio workflow into one non-technical
screen. It shows SEC, transcript, news, and price freshness; provides an explicit SEC refresh and curated
transcript/news import; creates and reviews exceptional-business/price-concern watches; shows triggered,
due, and overdue reviews; and compares two to eight companies using saved dossiers, CIO scenarios, current
portfolio weights, and overlapping economic exposures. These reads and deterministic comparisons do not
start a model. Only Ask and the explicit research, follow-up, and council controls invoke a model.

Saved dossier history is available per ticker. Select a completed version, write a focused question, and
choose **Ask follow-up** to reuse that report's validated context. A follow-up is smaller than a full
council dossier, but it still invokes the selected runner and consumes some of that account's allowance.
Active follow-ups can also be cancelled.

The separate **Independent council** control is the higher-cost independence mode. It freezes one context,
runs Evidence, Valuation, Bear, Buffett, Munger, Fisher, Asymmetric Growth, Technical/Momentum, and
Macro/Industry in separate local-runner processes, then lets a separate CIO synthesize only the validated
outputs. The confirmation states the exact call count before anything starts. Progress and cancellation remain visible;
completed agent cards expand to detailed claims, risks, invalidation conditions, open questions, and sources.
The combined council is saved locally as JSON and Markdown.

The **Deterministic valuation lab** accepts explicit normalized free cash flow, diluted shares, net debt,
and bear/base/bull assumptions. It calculates DCF values, a probability-weighted result, and reverse-DCF
implied growth without invoking a model. Example rates are visible starting points, not company facts.

The collapsed **Private portfolio & allocation** workspace is also model-free. It imports only a CSV the
user explicitly selects; it never reads the other AI-investor folders automatically. Required columns are
`ticker` and `market_value`. Optional approved columns are `name`, `quantity`, `price`, `sleeve`, `sector`,
`themes`, `economic_exposures`, and `currency`; every other column is rejected so account identifiers and
tax-lot details do not enter the application. The snapshot remains in local PostgreSQL and outside Git.

After import, enter a candidate weight, sleeve, sector, overlapping themes/economic drivers, and explicit
bear/base/bull probabilities and value multiples. The workspace calculates cash before/after, the strictest
policy ceiling, exposure blockers, scenario contribution, and permanent-loss impact using deterministic
backend code. It does not invoke a model, use an LLM API key, or place a trade.

Choose **Load CIO** to read the latest completed council without starting another model run. New CIO v2
reports supply scenario probabilities, numeric value multiples, narrative assumptions, conditions to act,
and invalidation conditions. The UI requires a separate **Approve CIO assumptions** action before the
allocation is allowed to carry `cio_approved` provenance. Editing any loaded probability or multiple makes
the calculation manual again. Older councils remain readable but cannot claim numeric CIO provenance.

After a CIO or allocation result is available, expand **Decision journal** to append a decision, review,
thesis update, or postmortem. A journal entry requires the action, thesis, rationale, at least one
invalidation condition, and a review date. It freezes the exact CIO/allocation context in local PostgreSQL.
Later entries can supersede an earlier entry, but the UI and backend expose no edit or delete operation.

## Run locally

First start PostgreSQL, migrations, and the backend from the sibling repository:

```bash
cd ../investment-os
make db-up
make migrate
make dev
make worker
```

In another terminal, install and run this UI:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/research](http://localhost:3000/research) for company work or
[http://localhost:3000/decisions](http://localhost:3000/decisions) for evidence, watches, reminders, and
company comparison. Open [http://localhost:3000/financials](http://localhost:3000/financials) for annual
financial statements, and [http://localhost:3000/industries](http://localhost:3000/industries) for the
searchable industry library.
The backend defaults to
`http://127.0.0.1:8000`; set `INVESTMENT_OS_API_URL` locally only if that changes.

For normal use, the sibling backend repository provides `make stack`, which starts PostgreSQL, applies
migrations, and runs both services. Use `make check-stack` there for a model-free health check.

Signals and saved research reads do not use a model. Each explicit Ask, follow-up, dossier, or council run
consumes some allowance from the selected locally signed-in Codex or Claude Code account.

## Verify changes

```bash
npm run lint
npm test
npm run build
```

This is currently a local-only application. Do not deploy it publicly until authentication, data privacy,
and remote job execution are designed explicitly.
