import InvestmentWorkspace from "@/components/InvestmentWorkspace";
import NavShell from "@/components/NavShell";

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string | string[] }>;
}) {
  const { ticker: queryTicker } = await searchParams;
  const initialTicker = typeof queryTicker === "string" ? queryTicker.trim().toUpperCase() || "AAPL" : "AAPL";
  return (
    <NavShell active="research">
      <InvestmentWorkspace initialTicker={initialTicker} />
    </NavShell>
  );
}
