"use client";

import React from "react";
import { TopCustomerItem } from "@/lib/overviewApi";

interface TopCustomersChartProps {
  data: TopCustomerItem[];
}

export function TopCustomersChart({ data }: TopCustomersChartProps) {
  const maxVal = Math.max(...data.map((d) => d.revenue), 70);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            Top 5 customer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Revenue Jan–Sep 2026 (IDR miliar)
          </p>
        </div>

        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
          Clustered bar
        </span>
      </div>

      {/* Bars List */}
      <div className="space-y-4 pt-3 flex-1 justify-center flex flex-col">
        {data.map((c) => (
          <div key={c.name} className="flex items-center gap-3">
            {/* Customer Name */}
            <span className="w-24 font-semibold text-xs text-slate-700 dark:text-slate-300 truncate shrink-0" title={c.name}>
              {c.name}
            </span>

            {/* Bar */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#1E3A8A] h-3 rounded-full transition-all duration-500"
                style={{ width: `${(c.revenue / maxVal) * 100}%` }}
              />
            </div>

            {/* Formatted Value */}
            <span className="w-16 text-right text-xs font-bold font-mono text-slate-800 dark:text-slate-200 shrink-0">
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
