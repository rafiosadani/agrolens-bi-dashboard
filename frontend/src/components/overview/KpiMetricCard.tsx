"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface KpiMetricCardProps {
  title: string;
  value: string;
  badgeLabel: string;
  badgeVariant?: "neutral" | "success" | "warning";
}

export function KpiMetricCard({
  title,
  value,
  badgeLabel,
  badgeVariant = "neutral",
}: KpiMetricCardProps) {
  const badgeStyles = {
    neutral:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700",
    success:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
    warning:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors min-h-[118px]">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </span>

      <div className="mt-2.5 flex items-baseline justify-between flex-wrap gap-2">
        <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-800 dark:text-slate-100 font-mono">
          {value}
        </span>

        <span
          className={cn(
            "inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border leading-none transition-colors",
            badgeStyles[badgeVariant]
          )}
        >
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}
