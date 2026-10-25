export interface KpiMetricItem {
  label: string;
  value_formatted: string;
  value_raw: number;
  badge_label: string;
  badge_variant: "neutral" | "success" | "warning";
}

export interface MonthlyRevenueItem {
  month: string;
  revenue: number;
  raw_revenue?: number;
  label: string;
}

export interface ProductTypeItem {
  name: string;
  percentage: number;
  color: string;
}

export interface CompetitorMetricItem {
  metric: string;
  company: number;
  benchmark: number;
}

export interface TopCustomerItem {
  name: string;
  revenue: number;
  label: string;
}

export interface OverviewSummaryData {
  period: string;
  entity: string;
  is_live_sql?: boolean;
  database_queried?: string;
  available_years?: number[];
  kpis: {
    target_rkap: KpiMetricItem;
    est_revenue_po: KpiMetricItem;
    ytd_real_revenue: KpiMetricItem;
    kesesuaian_rkap: KpiMetricItem;
  };
  monthly_revenue_2026: MonthlyRevenueItem[];
  revenue_by_product_type: {
    total_formatted: string;
    items: ProductTypeItem[];
  };
  competitor_position: CompetitorMetricItem[];
  top_5_customers: TopCustomerItem[];
}

export const INITIAL_OVERVIEW_DATA: OverviewSummaryData = {
  period: "Jan–Sep 2026",
  entity: "Semua",
  kpis: {
    target_rkap: {
      label: "Target RKAP 2026",
      value_formatted: "IDR 632 M",
      value_raw: 631981970171,
      badge_label: "Acuan pencapaian revenue",
      badge_variant: "neutral",
    },
    est_revenue_po: {
      label: "Est. capaian revenue (PO)",
      value_formatted: "IDR 503,82 M",
      value_raw: 503820000000,
      badge_label: "79,73% dari target · YTD + Outstanding",
      badge_variant: "success",
    },
    ytd_real_revenue: {
      label: "Capaian revenue YTD real",
      value_formatted: "IDR 400,92 M",
      value_raw: 400929809822,
      badge_label: "63,44% dari target · ▲ 28,54% YoY",
      badge_variant: "success",
    },
    kesesuaian_rkap: {
      label: "% Kesesuaian RKAP",
      value_formatted: "53,75%",
      value_raw: 53.75,
      badge_label: "34,10% terhadap target IDR 632 M",
      badge_variant: "neutral",
    },
  },
  monthly_revenue_2026: [],
  revenue_by_product_type: {
    total_formatted: "0,0 M",
    items: [],
  },
  competitor_position: [],
  top_5_customers: [],
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export async function fetchOverviewSummary(
  entity: string = "Semua",
  periode: string = "Jan–Sep 2026",
  source: string = "live_sql"
): Promise<OverviewSummaryData> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/overview/summary?entity=${encodeURIComponent(
        entity
      )}&periode=${encodeURIComponent(periode)}&source=${encodeURIComponent(source)}`,
      {
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn("[overviewApi] Could not fetch live summary, returning initial state:", error);
    return INITIAL_OVERVIEW_DATA;
  }
}

export async function uploadCompetitorFile(file: File): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/competitors/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload gagal dengan status ${res.status}`);
  }
  return await res.json();
}
