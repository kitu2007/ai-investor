import FinancialStatementsWorkspace from "@/components/FinancialStatementsWorkspace";
import NavShell from "@/components/NavShell";

export default function FinancialsPage() {
  return (
    <NavShell active="financials">
      <FinancialStatementsWorkspace />
    </NavShell>
  );
}
