import IndustryResearchWorkspace from "@/components/IndustryResearchWorkspace";
import NavShell from "@/components/NavShell";

export default function IndustriesPage() {
  return (
    <NavShell active="industries">
      <IndustryResearchWorkspace />
    </NavShell>
  );
}
