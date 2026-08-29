"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  ticker: string;
  className?: string;
  size?: "sm" | "xs";
}

export default function TickerLink({ ticker, className, size = "xs" }: Props) {
  const [copied, setCopied] = useState(false);
  const normalizedTicker = ticker.trim().toUpperCase();
  const encodedTicker = encodeURIComponent(normalizedTicker);

  function copyTicker(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(normalizedTicker).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const base = size === "xs"
    ? "text-[10px] font-mono"
    : "text-xs font-mono";

  return (
    <span className={`inline-flex items-center gap-1 ${base} ${className ?? ""}`} onClick={(event) => event.stopPropagation()}>
      <Link
        href={`/financials?ticker=${encodedTicker}`}
        title={`Open ${normalizedTicker} financials`}
        className="font-mono text-blue-400 transition-colors hover:text-blue-300 hover:underline"
      >
        {normalizedTicker}
      </Link>
      <Link
        href={`/prices?ticker=${encodedTicker}`}
        title={`Open ${normalizedTicker} price history`}
        className="rounded border border-gray-700 px-1 text-[9px] text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-300"
      >
        Price
      </Link>
      <Link
        href={`/research?ticker=${encodedTicker}`}
        title={`Open ${normalizedTicker} research workspace`}
        className="rounded border border-gray-700 px-1 text-[9px] text-gray-400 transition-colors hover:border-violet-500 hover:text-violet-300"
      >
        Research
      </Link>
      <a
        href={`https://finance.yahoo.com/quote/${encodedTicker}`}
        target="_blank"
        rel="noreferrer"
        title={`Open ${normalizedTicker} on Yahoo Finance`}
        className="text-gray-500 transition-colors hover:text-blue-300"
      >
        ↗
      </a>
      <button
        type="button"
        onClick={copyTicker}
        title={`Copy ${normalizedTicker}`}
        className="rounded border border-gray-700 px-1 text-[9px] text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-200"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
