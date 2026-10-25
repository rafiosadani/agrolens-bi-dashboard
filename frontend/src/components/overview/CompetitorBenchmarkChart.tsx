"use client";

import React from "react";
import { CompetitorMetricItem } from "@/lib/overviewApi";

interface CompetitorBenchmarkChartProps {
  data: CompetitorMetricItem[];
}

export function CompetitorBenchmarkChart({
  data,
}: CompetitorBenchmarkChartProps) {
  // Max percentage for scaling horizontal bars (approx 28% max)
  const maxVal = 28;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            Posisi vs kompetitor
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Profitabilitas perusahaan vs benchmark 3 perusahaan pupuk (%)
          </p>
        </div>

        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
          Clustered bar
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-medium pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-[#1E3A8A]" />
          <span className="text-slate-700 dark:text-slate-300">Perusahaan</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-[#7A9AB5]" />
          <span className="text-slate-700 dark:text-slate-300">Benchmark</span>
        </div>
      </div>

      {/* Clustered Bars */}
      <div className="space-y-4 pt-3 flex-1 justify-center flex flex-col">
        {data.map((item) => (
          <div key={item.metric} className="flex items-center gap-3">
            {/* Metric Label */}
            <span className="w-16 font-bold text-xs text-slate-800 dark:text-slate-200 shrink-0">
              {item.metric}
            </span>

            {/* Bars Column */}
            <div className="flex-1 space-y-1.5">
              {/* Perusahaan Bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#1E3A8A] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(item.company / maxVal) * 100}%` }}
                  />
                </div>
                <span className="w-14 text-right text-[11px] font-bold font-mono text-slate-800 dark:text-slate-200">
                  {item.company.toFixed(2).replace(".", ",")}%
                </span>
              </div>

              {/* Benchmark Bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#7A9AB5] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(item.benchmark / maxVal) * 100}%` }}
                  />
                </div>
                <span className="w-14 text-right text-[11px] font-semibold font-mono text-slate-500 dark:text-slate-400">
                  {item.benchmark.toFixed(2).replace(".", ",")}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
