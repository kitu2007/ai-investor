"use client";

import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, ColumnDef, SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { WatchlistEntry } from "@/lib/watchlist-types";
import { fmtPrice, fmtPct, fmt, marginColor, convictionColor } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown, RefreshCw } from "lucide-react";
import { Badge } from "./ui/badge";
import TickerLink from "./TickerLink";

interface Props {
  entries: WatchlistEntry[];
  onSelect: (e: WatchlistEntry) => void;
  selectedId?: string;
  globalFilter: string;
  onRefreshReturns: (ticker: string) => void;
  refreshing: Set<string>;
}

function ReturnCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-600">—</span>;
  const color = value >= 20 ? "text-emerald-400"
    : value >= 5  ? "text-emerald-300"
    : value >= 0  ? "text-gray-300"
    : value >= -10 ? "text-yellow-400"
    : value >= -30 ? "text-orange-400"
    : "text-red-400";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-mono text-xs font-medium ${color}`}>{sign}{value.toFixed(1)}%</span>;
}

export default function WatchlistTable({ entries, onSelect, selectedId, globalFilter, onRefreshReturns, refreshing }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "return1Y", desc: false }]);

  const columns: ColumnDef<WatchlistEntry>[] = [
    {
      id: "company",
      accessorFn: (r) => r.name,
      header: "Company",
      size: 170,
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-white text-sm">{row.original.name}</div>
          <TickerLink ticker={row.original.ticker} />
          <div className="text-[10px] text-gray-500">{row.original.exchange}</div>
        </div>
      ),
    },
    {
      accessorKey: "sector",
      header: "Sector",
      size: 110,
      cell: ({ getValue }) => <span className="text-xs text-gray-400">{getValue() as string || "—"}</span>,
    },
    {
      id: "moat",
      header: "Moat",
      size: 140,
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
      accessorKey: "currentPrice",
      header: "Price",
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="text-gray-200 font-mono text-xs">{fmtPrice(row.original.currentPrice)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRefreshReturns(row.original.ticker); }}
            className="text-gray-600 hover:text-gray-300 transition-colors"
            title="Refresh price data"
          >
            <RefreshCw size={10} className={refreshing.has(row.original.ticker) ? "animate-spin" : ""} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: "pctOffHigh",
      header: "% off High",
      size: 90,
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        if (v == null) return <span className="text-gray-600">—</span>;
        const color = v <= -50 ? "text-red-400" : v <= -30 ? "text-orange-400" : v <= -15 ? "text-yellow-400" : "text-gray-300";
        return <span className={`font-mono text-xs font-medium ${color}`}>{v.toFixed(1)}%</span>;
      },
    },
    {
      accessorKey: "return3M",
      header: "3M",
      size: 70,
      cell: ({ getValue }) => <ReturnCell value={getValue() as number | null} />,
    },
    {
      accessorKey: "return6M",
      header: "6M",
      size: 70,
      cell: ({ getValue }) => <ReturnCell value={getValue() as number | null} />,
    },
    {
      accessorKey: "return1Y",
      header: "1Y",
      size: 70,
      cell: ({ getValue }) => <ReturnCell value={getValue() as number | null} />,
    },
    {
      accessorKey: "return2Y",
      header: "2Y",
      size: 70,
      cell: ({ getValue }) => <ReturnCell value={getValue() as number | null} />,
    },
    {
      accessorKey: "return3Y",
      header: "3Y",
      size: 70,
      cell: ({ getValue }) => <ReturnCell value={getValue() as number | null} />,
    },
    {
      accessorKey: "return5Y",
      header: "5Y",
      size: 70,
      cell: ({ getValue }) => <ReturnCell value={getValue() as number | null} />,
    },
    {
      accessorKey: "grossMarginPct",
      header: "Gross Mg",
      size: 80,
      cell: ({ getValue }) => (
        <span className={`text-xs ${marginColor(getValue() as number | null)}`}>
          {fmtPct(getValue() as number | null)}
        </span>
      ),
    },
    {
      accessorKey: "operatingMarginPct",
      header: "Op Mg",
      size: 70,
      cell: ({ getValue }) => (
        <span className={`text-xs ${marginColor(getValue() as number | null)}`}>
          {fmtPct(getValue() as number | null)}
        </span>
      ),
    },
    {
      accessorKey: "roic",
      header: "ROIC",
      size: 65,
      cell: ({ getValue }) => (
        <span className={`text-xs ${marginColor(getValue() as number | null)}`}>
          {fmtPct(getValue() as number | null)}
        </span>
      ),
    },
    {
      accessorKey: "pe",
      header: "P/E",
      size: 55,
      cell: ({ getValue }) => <span className="text-gray-300 text-xs">{fmt(getValue() as number | null)}</span>,
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
      accessorKey: "thesis",
      header: "Why",
      size: 220,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return <span className="text-xs text-gray-400 line-clamp-2 max-w-[215px]" title={v}>{v}</span>;
      },
    },
  ];

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function SortIcon({ id }: { id: string }) {
    const sorted = table.getColumn(id)?.getIsSorted();
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
                <th key={h.id} style={{ width: h.getSize() }}
                  className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap cursor-pointer select-none hover:text-gray-200 sticky top-0 bg-gray-950"
                  onClick={h.column.getToggleSortingHandler()}>
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
                No companies in this watchlist yet.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onSelect(row.original)}
                className={`border-b border-gray-800 cursor-pointer transition-colors ${
                  selectedId === row.original.id ? "bg-blue-950/50" : "hover:bg-gray-800/50"
                }`}>
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
