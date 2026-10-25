export interface KpiMetricItem {
  id: string;
  label: string;
  valueFormatted: string;
  valueRaw: number;
  badgeLabel: string;
  badgeVariant: "neutral" | "success" | "warning" | "danger";
  tooltip: string;
  description: string;
}

/**
 * PUSAT PENGELOLAAN DATA TAHAP 1.1 (Card Metrik Ringkasan)
 * -------------------------------------------------------------
 * File ini adalah Single Source of Truth untuk 4 Card Metrik di Halaman Ringkasan.
 * Anda dapat dengan bebas mengubah angka, label, atau badge di sini
 * saat menerima data final dari mentor atau rekan magang.
 */
export const MOCK_KPI_DATA: Record<string, KpiMetricItem> = {
  target_rkap: {
    id: "target_rkap",
    label: "Target RKAP 2026",
    valueFormatted: "IDR 632 M",
    valueRaw: 631_981_970_171,
    badgeLabel: "Acuan pencapaian revenue",
    badgeVariant: "neutral",
    tooltip: "Anggaran target tahunan Rencana Kerja & Anggaran Perusahaan (RKAP) PT Agrofarm 2026.",
    description: "Target acuan seluruh konsolidasi entitas (API, AMG, ANR).",
  },
  est_revenue_po: {
    id: "est_revenue_po",
    label: "Est. capaian revenue (PO)",
    valueFormatted: "IDR 503,82 M",
    valueRaw: 503_820_000_000,
    badgeLabel: "79,73% dari target · YTD + Outstanding",
    badgeVariant: "success",
    tooltip: "Estimasi total omzet dari pesanan: Penjualan Real YTD + PO yang masih dalam proses pengiriman.",
    description: "Proyeksi pencapaian hingga akhir kuartal berjalan.",
  },
  ytd_real_revenue: {
    id: "ytd_real_revenue",
    label: "Capaian revenue YTD real",
    valueFormatted: "IDR 400,92 M",
    valueRaw: 400_929_809_822,
    badgeLabel: "63,44% dari target · ▲ 28,54% YoY",
    badgeVariant: "success",
    tooltip: "Total realisasi penjualan nyata faktur komersial per September 2026 yang sudah terbit di database SQL.",
    description: "Penjualan bersih setelah eliminasi transaksi internal antarentitas.",
  },
  kesesuaian_rkap: {
    id: "kesesuaian_rkap",
    label: "% Kesesuaian RKAP",
    valueFormatted: "53,75%",
    valueRaw: 53.75,
    badgeLabel: "34,10% terhadap target IDR 632 M",
    badgeVariant: "neutral",
    tooltip: "Rasio proporsional capaian real terhadap target anggaran tahunan berjalan.",
    description: "Evaluasi kinerja pencapaian target anggaran manajerial.",
  },
};
