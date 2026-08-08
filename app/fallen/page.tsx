import WatchlistView from "@/components/WatchlistView";
import NavShell from "@/components/NavShell";

export default function FallenPage() {
  return (
    <NavShell active="fallen">
      <WatchlistView kind="fallen" />
    </NavShell>
  );
}
