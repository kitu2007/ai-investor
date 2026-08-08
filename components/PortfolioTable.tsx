"use client";

import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
  ColumnDef, SortingState, ColumnFiltersState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Company } from "@/lib/types";
import { fmtPct, fmtPrice, fmt, marginColor, growthColor, scoreColor, convictionColor } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import TickerLink from "./TickerLink";

interface Props {
  companies: Company[];
  onSelect: (c: Company) => void;
  selectedId?: string;
  globalFilter: string;
}

function Cell({ value, className }: { value: string; className?: string }) {
  return <span className={className}>{value}</span>;
}

function ScoreDot({ score }: { score: number | null }) {
  if (!score) return <span className="text-gray-600">—</span>;
  const color = score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-yellow-500" : "bg-red-500";
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className={scoreColor(score)}>{score}</span>
    </span>
  );
}

export default function PortfolioTable({ companies, onSelect, selectedId, globalFilter }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns: ColumnDef<Company>[] = [
    {
      id: "company",
      accessorFn: (r) => r.name,
      header: "Company",
      size: 180,
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-white text-sm">{row.original.name}</div>
          <TickerLink ticker={row.original.ticker} />
        </div>
      ),
    },
    {
      accessorKey: "sector",
      header: "Sector",
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-300">{getValue() as string || "—"}</span>
      ),
    },
    {
      id: "moat",
      header: "Moat",
      size: 160,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.moatTypes.slice(0, 2).map((m) => (
            <Badge key={m} className="bg-blue-950 text-blue-300 text-[10px] px-1.5">{m}</Badge>
          ))}
          {row.original.moatTypes.length > 2 && (
            <Badge className="bg-gray-700 text-gray-400 text-[10px] px-1.5">+{row.original.moatTypes.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "moatScore",
      header: "Moat",
      size: 60,
      cell: ({ getValue }) => <ScoreDot score={getValue() as number | null} />,
    },
    {
      accessorKey: "managementQuality",
      header: "Mgmt",
      size: 60,
      cell: ({ getValue }) => <ScoreDot score={getValue() as number | null} />,
    },
    {
      accessorKey: "pricingPower",
      header: "Pricing",
      size: 70,
      cell: ({ getValue }) => <ScoreDot score={getValue() as number | null} />,
    },
    {
      accessorKey: "grossMarginPct",
      header: "Gross Mg",
      size: 80,
      cell: ({ getValue }) => (
        <Cell value={fmtPct(getValue() as number | null)} className={marginColor(getValue() as number | null)} />
      ),
    },
    {
      accessorKey: "operatingMarginPct",
      header: "Op Mg",
      size: 70,
      cell: ({ getValue }) => (
        <Cell value={fmtPct(getValue() as number | null)} className={marginColor(getValue() as number | null)} />
      ),
    },
    {
      accessorKey: "netMarginPct",
      header: "Net Mg",
      size: 70,
      cell: ({ getValue }) => (
        <Cell value={fmtPct(getValue() as number | null)} className={marginColor(getValue() as number | null)} />
      ),
    },
    {
      accessorKey: "revenueCAGR3Y",
      header: "Rev 3Y",
      size: 70,
      cell: ({ getValue }) => (
        <Cell value={fmtPct(getValue() as number | null)} className={growthColor(getValue() as number | null)} />
      ),
    },
    {
      accessorKey: "roic",
      header: "ROIC",
      size: 65,
      cell: ({ getValue }) => (
        <Cell value={fmtPct(getValue() as number | null)} className={marginColor(getValue() as number | null)} />
      ),
    },
    {
      id: "gurus",
      header: "Gurus",
      size: 200,
      cell: ({ row }) => {
        const gurus = (row.original.gurus ?? []) as string[];
        if (!gurus.length) return <span className="text-gray-600 text-xs">—</span>;
        const shown = gurus.slice(0, 2);
        const rest = gurus.length - shown.length;
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map((g) => (
              <span key={g} className="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-800/50 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                {g.split(" ").pop()}
              </span>
            ))}
            {rest > 0 && (
              <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">+{rest}</span>
            )}
          </div>
        );
      },
    },
    {
      id: "ceo",
      header: "CEO",
      size: 130,
      cell: ({ row }) => {
        const { ceoName, founderLed, ceoTenureYears } = row.original;
        if (!ceoName) return <span className="text-gray-600">—</span>;
        return (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-200">{ceoName}</span>
              {founderLed && (
                <span className="text-[10px] bg-amber-900 text-amber-300 px-1 rounded font-medium">Founder</span>
              )}
            </div>
            {ceoTenureYears != null && (
              <div className="text-[10px] text-gray-500">{ceoTenureYears}y tenure</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "rdPctRevenue",
      header: "R&D %",
      size: 65,
      cell: ({ getValue }) => (
        <Cell value={fmtPct(getValue() as number | null)} className={growthColor(getValue() as number | null)} />
      ),
    },
    {
      id: "earnings",
      header: "Earnings",
      size: 75,
      cell: ({ row }) => {
        const beat = row.original.lastEarningsBeat;
        if (beat == null) return <span className="text-gray-600">—</span>;
        return (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${beat ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
            {beat ? "Beat" : "Missed"}
          </span>
        );
      },
    },
    {
      accessorKey: "nextCatalyst",
      header: "Next Catalyst",
      size: 180,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? (
          <span className="text-xs text-yellow-300/80 truncate block max-w-[175px]" title={v}>{v}</span>
        ) : <span className="text-gray-600">—</span>;
      },
    },
    {
      accessorKey: "currentPrice",
      header: "Price",
      size: 80,
      cell: ({ getValue }) => (
        <span className="text-gray-200 font-mono text-xs">{fmtPrice(getValue() as number | null)}</span>
      ),
    },
    {
      accessorKey: "pe",
      header: "P/E",
      size: 55,
      cell: ({ getValue }) => (
        <span className="text-gray-300 text-xs">{fmt(getValue() as number | null)}</span>
      ),
    },
    {
      accessorKey: "evEbitda",
      header: "EV/EBITDA",
      size: 80,
      cell: ({ getValue }) => (
        <span className="text-gray-300 text-xs">{fmt(getValue() as number | null)}</span>
      ),
    },
    {
      accessorKey: "overallScore",
      header: "Score",
      size: 65,
      cell: ({ getValue }) => {
        const s = getValue() as number | null;
        if (!s) return <span className="text-gray-600">—</span>;
        const color = s >= 8 ? "text-emerald-400 bg-emerald-900" : s >= 5 ? "text-yellow-400 bg-yellow-900" : "text-red-400 bg-red-900";
        return <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>{s}/10</span>;
      },
    },
    {
      accessorKey: "conviction",
      header: "Conviction",
      size: 85,
      cell: ({ getValue }) => {
        const c = getValue() as string;
        return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${convictionColor(c)}`}>{c}</span>;
      },
    },
    {
      id: "products",
      header: "Products",
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs text-gray-400 truncate block max-w-[155px]">
          {row.original.keyProducts.slice(0, 3).join(", ") || "—"}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: companies,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function SortIcon({ id }: { id: string }) {
    const col = table.getColumn(id);
    const sorted = col?.getIsSorted();
    if (sorted === "asc") return <ChevronUp size={12} />;
    if (sorted === "desc") return <ChevronDown size={12} />;
    return <ChevronsUpDown size={12} className="opacity-30" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-gray-700">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  style={{ width: h.getSize() }}
                  className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap cursor-pointer select-none hover:text-gray-200 sticky top-0 bg-gray-950"
                  onClick={h.column.getToggleSortingHandler()}
                >
                  <span className="flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getCanSort() && <SortIcon id={h.id} />}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                No companies yet. Click "+ Add Company" to start building your research portfolio.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row.original)}
                className={`border-b border-gray-800 cursor-pointer transition-colors ${
                  selectedId === row.original.id
                    ? "bg-blue-950/50"
                    : "hover:bg-gray-800/50"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
