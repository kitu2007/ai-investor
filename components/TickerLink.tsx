"use client";

import { useState } from "react";

interface Props {
  ticker: string;
  className?: string;
  size?: "sm" | "xs";
}

export default function TickerLink({ ticker, className, size = "xs" }: Props) {
  const [copied, setCopied] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(ticker).catch(() => {});
    // Open Stocks app (won't navigate to ticker, but brings it to front)
    window.location.href = "stocks://";
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const base = size === "xs"
    ? "text-[10px] font-mono"
    : "text-xs font-mono";

  return (
    <button
      onClick={handleClick}
      title="Click to copy ticker & open Stocks app — then paste in search"
      className={`${base} text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors ${className ?? ""}`}
    >
      {copied ? "✓ Copied!" : `${ticker} ↗`}
    </button>
  );
}
