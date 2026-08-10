import DecisionToolsWorkspace from "@/components/DecisionToolsWorkspace";
import NavShell from "@/components/NavShell";

export default function DecisionsPage() {
  return (
    <NavShell active="decisions">
      <DecisionToolsWorkspace />
    </NavShell>
  );
}
