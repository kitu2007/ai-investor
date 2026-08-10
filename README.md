# Investment OS workspace

This private Next.js application is the local, non-technical workspace for Investment OS. It connects to
the FastAPI backend in the sibling `investment-os` directory and separates two kinds of work:

- **Quick signals** fetch daily ticker and SPY prices, then calculate moving averages, RSI, MACD,
  drawdown, momentum, and relative strength without an LLM. The same provider-labelled observations are
  persisted in the local backend with source URL, retrieval time, and idempotent date keys.
- **Request Codex** sends the question and authoritative technical snapshot to the local backend, which
  creates a validated, saved, multi-perspective research dossier using the Mac's existing ChatGPT/Codex
  sign-in. No project API key is required. The first click opens a review step; nothing is queued until
  **Start Codex analysis** is pressed. Queued or running requests can be cancelled from the same control.

The UI shows the dossier's synthesis, bear/base/bull scenarios, independent views, disagreements, and
sources. Choose **Read full dossier** for the complete Evidence, Valuation, Bear, Buffett, Munger,
Fisher, Asymmetric Growth, Technical/Momentum, and Macro/Industry reasoning. Each detailed view includes
cited claims, risks, invalidation conditions, and unresolved questions. The exact saved Markdown can be
opened or copied from that reader. Reports remain local and outside Git.

Saved dossier history is available per ticker. Select a completed version, write a focused question, and
choose **Ask follow-up** to reuse that report's validated context. A follow-up is smaller than a full
council dossier, but it still invokes Codex and consumes some of the signed-in account's allowance.
Active follow-ups can also be cancelled.

The separate **Independent council** control is the higher-cost independence mode. It freezes one context,
runs Evidence, Valuation, Bear, Buffett, Munger, Fisher, Asymmetric Growth, Technical/Momentum, and
Macro/Industry in separate Codex processes, then lets a separate CIO synthesize only the validated outputs.
The confirmation states that this uses up to ten Codex calls. Progress and cancellation remain visible;
completed agent cards expand to detailed claims, risks, invalidation conditions, open questions, and sources.
The combined council is saved locally as JSON and Markdown.

The **Deterministic valuation lab** accepts explicit normalized free cash flow, diluted shares, net debt,
and bear/base/bull assumptions. It calculates DCF values, a probability-weighted result, and reverse-DCF
implied growth without invoking a model. Example rates are visible starting points, not company facts.

## Run locally

First start PostgreSQL, migrations, and the backend from the sibling repository:

```bash
cd ../investment-os
make db-up
make migrate
make dev
```

In another terminal, install and run this UI:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/research](http://localhost:3000/research). The backend defaults to
`http://127.0.0.1:8000`; set `INVESTMENT_OS_API_URL` locally only if that changes.

For normal use, the sibling backend repository provides `make stack`, which starts PostgreSQL, applies
migrations, and runs both services. Use `make check-stack` there for a model-free health check.

Quick signals and saved research reads do not use Codex. Each explicit **Request Codex** action consumes
some of the allowance attached to the signed-in Codex account.

## Verify changes

```bash
npm run lint
npm run build
```

This is currently a local-only application. Do not deploy it publicly until authentication, data privacy,
and remote job execution are designed explicitly.
