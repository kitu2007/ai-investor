import InvestmentWorkspace from "@/components/InvestmentWorkspace";
import NavShell from "@/components/NavShell";

export default function ResearchPage() {
  return (
    <NavShell active="research">
      <InvestmentWorkspace />
    </NavShell>
  );
}
