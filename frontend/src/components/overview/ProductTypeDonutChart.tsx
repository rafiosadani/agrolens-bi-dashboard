"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { ProductTypeItem } from "@/lib/overviewApi";

interface ProductTypeDonutChartProps {
  totalFormatted: string;
  items: ProductTypeItem[];
}

export function ProductTypeDonutChart({
  totalFormatted,
  items,
}: ProductTypeDonutChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            Revenue per jenis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Porsi terhadap total YTD
          </p>
        </div>

        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
          Donut chart
        </span>
      </div>

      {/* Donut & Legend Container */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-64 sm:h-72 w-full">
        {/* Donut with Center Text */}
        <div className="relative h-48 w-48 sm:h-56 sm:w-56 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="percentage"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
              >
                {items.map((entry, index) => (
                  <Cell
                    key={`slice-${index}`}
                    fill={entry.color}
                    className="hover:opacity-90 transition-opacity cursor-pointer outline-none"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ProductTypeItem;
                    return (
                      <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-md font-medium">
                        <span className="block font-semibold">{data.name}</span>
                        <span className="font-mono text-slate-200 font-bold">
                          {data.percentage}% dari total
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Text */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-slate-400 font-medium">Total</span>
            <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 font-mono leading-tight">
              {totalFormatted}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-3 shrink-0 min-w-[140px]">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-2.5 text-xs">
              <span
                className="h-3.5 w-3.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {item.name}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono font-medium">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
