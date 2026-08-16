import NavShell from "@/components/NavShell";
import PriceHistoryWorkspace from "@/components/PriceHistoryWorkspace";

export default function PricesPage() {
  return (
    <NavShell active="prices">
      <PriceHistoryWorkspace />
    </NavShell>
  );
}
