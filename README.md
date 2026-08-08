# Investment OS workspace

This private Next.js application is the local, non-technical workspace for Investment OS. It connects to
the FastAPI backend in the sibling `investment-os` directory and separates two kinds of work:

- **Quick signals** fetch daily ticker and SPY prices, then calculate moving averages, RSI, MACD,
  drawdown, momentum, and relative strength without an LLM.
- **Request Codex** sends the question and authoritative technical snapshot to the local backend, which
  creates a validated, saved, multi-perspective research dossier using the Mac's existing ChatGPT/Codex
  sign-in. No project API key is required.

The UI shows the dossier's synthesis, bear/base/bull scenarios, independent views, disagreements, and
sources. Reports remain local and outside Git.

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

Quick signals and saved research reads do not use Codex. Each explicit **Request Codex** action consumes
some of the allowance attached to the signed-in Codex account.

## Verify changes

```bash
npm run lint
npm run build
```

This is currently a local-only application. Do not deploy it publicly until authentication, data privacy,
and remote job execution are designed explicitly.
