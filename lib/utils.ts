import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(value: number | null | undefined, suffix = "", decimals = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}${suffix}`;
}

export function fmtPct(value: number | null | undefined) {
  return fmt(value, "%");
}

export function fmtPrice(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function scoreColor(score: number | null): string {
  if (score == null) return "text-gray-400";
  if (score >= 4) return "text-emerald-400";
  if (score >= 3) return "text-yellow-400";
  return "text-red-400";
}

export function marginColor(pct: number | null): string {
  if (pct == null) return "text-gray-400";
  if (pct >= 20) return "text-emerald-400";
  if (pct >= 10) return "text-yellow-400";
  return "text-red-400";
}

export function growthColor(pct: number | null): string {
  if (pct == null) return "text-gray-400";
  if (pct >= 15) return "text-emerald-400";
  if (pct >= 5) return "text-yellow-400";
  if (pct >= 0) return "text-gray-300";
  return "text-red-400";
}

export function convictionColor(c: string): string {
  switch (c) {
    case "High": return "bg-emerald-900 text-emerald-300";
    case "Medium": return "bg-blue-900 text-blue-300";
    case "Low": return "bg-gray-800 text-gray-400";
    case "Watch": return "bg-yellow-900 text-yellow-300";
    default: return "bg-gray-800 text-gray-400";
  }
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
