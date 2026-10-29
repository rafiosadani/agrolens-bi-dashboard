import { getApiBaseUrl } from "./overviewApi";

export interface AmgSalesSummary {
  total_rows: number;
  total_invoices: number;
  total_customers: number;
  total_penjualan: number;
  total_hpp: number;
  total_gross_profit: number;
  gross_margin_percentage: number;
}

export interface AmgSalesItem {
  Periode: number;
  Tahun: number;
  "No Invoice": string;
  "Tgl Trn": string;
  "Nama Customer": string;
  Produk: string;
  "Nama Sales": string;
  "Kode Barang": string;
  "Nama Barang": string;
  Qty: number;
  "U/M": string;
  "Harga Jual Net": number;
  HPP: number;
  "Perubahan HPP": number;
  "HPP Konsol": number;
  "Laba / Rugi": number;
  "Laba / Rugi Konsol": number;
  "Jumlah HPP": number;
  "Jumlah (Gross Profit)": number;
  Penjualan: number;
  "Nilai HPP": number;
  "Nilai HPP Konsol": number;
  ELIMINASI: string;
  PT: string;
  GROUP: string;
  "Nama Barang Standard": string;
}

export interface AmgSalesResponse {
  entity: string;
  database: string;
  year: number;
  layer: "raw" | "financial";
  audited_target?: number;
  summary: AmgSalesSummary;
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
  items: AmgSalesItem[];
  error?: string;
}

export interface AmgReconciliationResponse {
  entity: string;
  year: number;
  is_closed_year: boolean;
  audited_target?: number;
  raw_erp_total: number;
  financial_layer_total: number;
  variance: number;
  match_status: string;
  notes: string[];
  raw_summary?: AmgSalesSummary;
  financial_summary?: AmgSalesSummary;
}

export async function fetchAmgSales(
  layer: "raw" | "financial" = "financial",
  year: number = 2025,
  options?: {
    month?: number;
    limit?: number;
    offset?: number;
    search?: string;
  }
): Promise<AmgSalesResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = layer === "raw" ? "/sales/amg/raw" : "/sales/amg/financial";

  const params = new URLSearchParams({
    year: String(year),
    limit: String(options?.limit ?? 50),
    offset: String(options?.offset ?? 0),
  });

  if (options?.month) params.append("month", String(options.month));
  if (options?.search) params.append("search", options.search);

  const res = await fetch(`${baseUrl}${endpoint}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch AMG sales data (${res.status})`);
  }
  return await res.json();
}

export async function fetchAmgReconciliation(year: number = 2025): Promise<AmgReconciliationResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/sales/amg/reconciliation?year=${year}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch AMG reconciliation (${res.status})`);
  }
  return await res.json();
}

export async function fetchAmgSqlSource(year: number, layer: "raw" | "financial"): Promise<{ filename: string; sql: string }> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/sales/amg/query-source?year=${year}&layer=${layer}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch SQL source (${res.status})`);
  }
  return await res.json();
}

