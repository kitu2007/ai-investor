"use client";

import { useEffect, useState, useCallback } from "react";
import { Company } from "@/lib/types";
import PortfolioTable from "@/components/PortfolioTable";
import DetailPanel from "@/components/DetailPanel";
import CompanyForm from "@/components/CompanyForm";
import NavShell from "@/components/NavShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw, BarChart3, Star } from "lucide-react";

async function fetchCompanies(): Promise<Company[]> {
  const response = await fetch("/api/portfolio");
  return (await response.json()) as Company[];
}

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | undefined>(undefined);
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchCompanies();
    setCompanies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCompanies().then((data) => {
      if (!active) return;
      setCompanies(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(company: Company) {
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });
    await load();
    setShowForm(false);
    setEditTarget(undefined);
    setSelected(company);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this company from your portfolio?")) return;
    await fetch("/api/portfolio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSelected(null);
    await load();
  }

  function handleEdit(company: Company) {
    setEditTarget(company);
    setShowForm(true);
  }

  const highConviction = companies.filter((c) => c.conviction === "High").length;
  const marginCompanies = companies.filter((c) => c.grossMarginPct != null);
  const avgGrossMargin = marginCompanies.length
    ? (marginCompanies.reduce((s, c) => s + (c.grossMarginPct ?? 0), 0) / marginCompanies.length).toFixed(1)
    : "—";

  const rightSlot = (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-4 text-xs text-gray-400 mr-2">
        <span className="flex items-center gap-1"><Star size={11} className="text-yellow-500" />{highConviction} High Conv.</span>
        <span><BarChart3 size={11} className="text-emerald-500 inline mr-1" />GM: {avgGrossMargin}{avgGrossMargin !== "—" ? "%" : ""}</span>
      </div>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <Input className="pl-8 w-44 h-8 text-xs" placeholder="Search..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
      </div>
      <Button variant="ghost" size="icon" onClick={load}><RefreshCw size={13} /></Button>
      <Button size="sm" onClick={() => { setEditTarget(undefined); setShowForm(true); }}>
        <Plus size={13} className="mr-1" /> Add
      </Button>
    </div>
  );

  return (
    <NavShell active="portfolio" rightSlot={rightSlot}>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
          ) : (
            <PortfolioTable companies={companies} onSelect={setSelected} selectedId={selected?.id} globalFilter={globalFilter} />
          )}
        </div>
        {selected && (
          <DetailPanel company={selected} onEdit={() => handleEdit(selected)} onDelete={() => handleDelete(selected.id)} onClose={() => setSelected(null)} />
        )}
      </div>
      {showForm && (
        <CompanyForm initial={editTarget} onSave={handleSave} onClose={() => { setShowForm(false); setEditTarget(undefined); }} />
      )}
    </NavShell>
  );
}
