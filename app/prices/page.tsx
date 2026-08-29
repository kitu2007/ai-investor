import NavShell from "@/components/NavShell";
import PriceHistoryWorkspace from "@/components/PriceHistoryWorkspace";

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string | string[] }>;
}) {
  const { ticker: queryTicker } = await searchParams;
  const initialTicker = typeof queryTicker === "string" ? queryTicker.trim().toUpperCase() || "NVDA" : "NVDA";
  return (
    <NavShell active="prices">
      <PriceHistoryWorkspace key={initialTicker} initialTicker={initialTicker} />
    </NavShell>
  );
}
