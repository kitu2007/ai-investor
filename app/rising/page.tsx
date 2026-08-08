import WatchlistView from "@/components/WatchlistView";
import NavShell from "@/components/NavShell";

export default function RisingPage() {
  return (
    <NavShell active="rising">
      <WatchlistView kind="rising" />
    </NavShell>
  );
}
