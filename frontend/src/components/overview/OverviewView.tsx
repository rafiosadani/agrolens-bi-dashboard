"use client";

import React, { useEffect, useState, useRef } from "react";
import { KpiMetricCard } from "./KpiMetricCard";
import { MonthlyRevenueChart } from "./MonthlyRevenueChart";
import { ProductTypeDonutChart } from "./ProductTypeDonutChart";
import { CompetitorBenchmarkChart } from "./CompetitorBenchmarkChart";
import { TopCustomersChart } from "./TopCustomersChart";
import {
  KpiCardSkeleton,
  MonthlyRevenueChartSkeleton,
  DonutChartSkeleton,
  HorizontalBarChartSkeleton,
} from "@/components/common/Skeleton";
import {
  OverviewSummaryData,
  INITIAL_OVERVIEW_DATA,
  fetchOverviewSummary,
} from "@/lib/overviewApi";

interface OverviewViewProps {
  entity: string;
  period: string;
  refreshTrigger: number;
  onDatabaseResolved?: (dbQueried: string) => void;
  onYearsResolved?: (years: number[]) => void;
  onUpdatingChange?: (isUpdating: boolean) => void;
}

export function OverviewView({
  entity,
  period,
  refreshTrigger,
  onDatabaseResolved,
  onYearsResolved,
  onUpdatingChange,
}: OverviewViewProps) {
  const [data, setData] = useState<OverviewSummaryData>(INITIAL_OVERVIEW_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const isInitialMount = useRef<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    if (isInitialMount.current) {
      setLoading(true);
    } else {
      setIsUpdating(true);
      onUpdatingChange?.(true);
    }

    // Best practice: 350ms subtle intentional feedback window prevents jarring micro-flickers
    Promise.all([
      fetchOverviewSummary(entity, period),
      new Promise((resolve) => setTimeout(resolve, 350)),
    ])
      .then(([res]) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
        setIsUpdating(false);
        onUpdatingChange?.(false);

        if (res.database_queried) {
          onDatabaseResolved?.(res.database_queried);
        }
        if (res.available_years && res.available_years.length > 0) {
          onYearsResolved?.(res.available_years);
        }
        isInitialMount.current = false;
      })
      .catch((err) => {
        console.error("Overview fetch error:", err);
        if (isMounted) {
          setLoading(false);
          setIsUpdating(false);
          onUpdatingChange?.(false);
          isInitialMount.current = false;
        }
      });

    return () => {
      isMounted = false;
    };
  }, [entity, period, refreshTrigger, onDatabaseResolved, onYearsResolved, onUpdatingChange]);

  const { kpis, monthly_revenue_2026, revenue_by_product_type, competitor_position, top_5_customers } = data;

  // Initial Full Mount: Display executive glassmorphic skeletons with exact spatial matching
  if (loading && isInitialMount.current) {
    return (
      <div className="space-y-4 px-6 sm:px-8 pb-10 animate-in fade-in duration-300">
        {/* Row 1 Skeletons: 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>

        {/* Row 2 Skeletons: Monthly Revenue & Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <MonthlyRevenueChartSkeleton />
          </div>
          <div className="lg:col-span-2">
            <DonutChartSkeleton />
          </div>
        </div>

        {/* Row 3 Skeletons: Competitor Benchmark & Top 5 Customer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HorizontalBarChartSkeleton />
          <HorizontalBarChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-4 px-6 sm:px-8 pb-10 transition-opacity duration-300 ease-out ${
        isUpdating ? "opacity-60 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Row 1: 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiMetricCard
          title={kpis.target_rkap.label}
          value={kpis.target_rkap.value_formatted}
          badgeLabel={kpis.target_rkap.badge_label}
          badgeVariant={kpis.target_rkap.badge_variant}
        />

        <KpiMetricCard
          title={kpis.est_revenue_po.label}
          value={kpis.est_revenue_po.value_formatted}
          badgeLabel={kpis.est_revenue_po.badge_label}
          badgeVariant={kpis.est_revenue_po.badge_variant}
        />

        <KpiMetricCard
          title={kpis.ytd_real_revenue.label}
          value={kpis.ytd_real_revenue.value_formatted}
          badgeLabel={kpis.ytd_real_revenue.badge_label}
          badgeVariant={kpis.ytd_real_revenue.badge_variant}
        />

        <KpiMetricCard
          title={kpis.kesesuaian_rkap.label}
          value={kpis.kesesuaian_rkap.value_formatted}
          badgeLabel={kpis.kesesuaian_rkap.badge_label}
          badgeVariant={kpis.kesesuaian_rkap.badge_variant}
        />
      </div>

      {/* Row 2: 2 Column Charts (Monthly Revenue & Revenue per Jenis) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Monthly Revenue Clustered Column (Takes 3 of 5 cols) */}
        <div className="lg:col-span-3">
          <MonthlyRevenueChart
            data={monthly_revenue_2026}
            period={data.period || period}
            databaseQueried={data.database_queried}
          />
        </div>

        {/* Right: Revenue per Jenis Donut Chart (Takes 2 of 5 cols) */}
        <div className="lg:col-span-2">
          <ProductTypeDonutChart
            totalFormatted={revenue_by_product_type.total_formatted}
            totalRaw={revenue_by_product_type.total_raw}
            items={revenue_by_product_type.items}
            period={data.period || period}
            databaseQueried={data.database_queried}
          />
        </div>
      </div>

      {/* Row 3: 2 Column Charts (Posisi vs Kompetitor & Top 5 Customer) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Posisi vs Kompetitor */}
        <div>
          <CompetitorBenchmarkChart data={competitor_position} />
        </div>

        {/* Right: Top 5 Customer */}
        <div>
          <TopCustomersChart data={top_5_customers} />
        </div>
      </div>
    </div>
  );
}
