import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer-wave rounded-lg ${className}`} />;
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[126px]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="py-1">
        <Skeleton className="h-8 w-40 rounded-md" />
      </div>
      <div className="pt-1">
        <Skeleton className="h-5 w-48 rounded-full" />
      </div>
    </div>
  );
}

export function MonthlyRevenueChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[380px]">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Chart Canvas Skeleton with 10 discrete bars and baseline */}
      <div className="relative h-64 sm:h-72 w-full flex items-end justify-between gap-3 px-4 pt-6 pb-2">
        {/* Subtle Horizontal Guide Lines */}
        <div className="absolute inset-x-4 top-8 border-b border-dashed border-slate-100 dark:border-slate-800" />
        <div className="absolute inset-x-4 top-24 border-b border-dashed border-slate-100 dark:border-slate-800" />
        <div className="absolute inset-x-4 top-40 border-b border-dashed border-slate-100 dark:border-slate-800" />

        {/* 10 Realistic Bars */}
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[28%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[62%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[52%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[38%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[46%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[74%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[92%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[84%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <Skeleton className="h-[12%] w-full max-w-[34px] rounded-t-xs" />
          <Skeleton className="h-2.5 w-6 rounded-xs" />
        </div>
      </div>
    </div>
  );
}

export function DonutChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[380px]">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-2">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* Donut Center Cutout Ring Skeleton */}
      <div className="flex items-center justify-center py-4 relative">
        <div className="h-40 w-40 rounded-full shimmer-wave flex items-center justify-center p-7">
          <div className="h-full w-full rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-1">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>

      {/* Legend Rows */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-3 w-18" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

export function HorizontalBarChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[320px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* 5 Horizontal Rows */}
      <div className="space-y-3 pt-2">
        {[85, 68, 54, 42, 35].map((width, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full shimmer-wave"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
