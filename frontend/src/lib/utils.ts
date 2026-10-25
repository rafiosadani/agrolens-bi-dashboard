import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numbers into Indonesian Rupiah (IDR).
 * If compact=true: formats as Rp 14.5 M (Milyar) or Rp 450 Jt (Juta)
 */
export function formatRupiah(value: number, compact: boolean = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "Rp 0";
  }

  if (compact) {
    const absVal = Math.abs(value);
    if (absVal >= 1_000_000_000_000) {
      return `Rp ${(value / 1_000_000_000_000).toFixed(2)} T`;
    }
    if (absVal >= 1_000_000_000) {
      return `Rp ${(value / 1_000_000_000).toFixed(2)} M`;
    }
    if (absVal >= 1_000_000) {
      return `Rp ${(value / 1_000_000).toFixed(1)} Jt`;
    }
    if (absVal >= 1_000) {
      return `Rp ${(value / 1_000).toFixed(0)} Rb`;
    }
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatPercent(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}
