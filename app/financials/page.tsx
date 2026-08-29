import FinancialStatementsWorkspace from "@/components/FinancialStatementsWorkspace";
import NavShell from "@/components/NavShell";

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string | string[] }>;
}) {
  const { ticker: queryTicker } = await searchParams;
  const initialTicker = typeof queryTicker === "string" ? queryTicker.trim().toUpperCase() || "NVDA" : "NVDA";
  return (
    <NavShell active="financials">
      <FinancialStatementsWorkspace initialTicker={initialTicker} />
    </NavShell>
  );
}
