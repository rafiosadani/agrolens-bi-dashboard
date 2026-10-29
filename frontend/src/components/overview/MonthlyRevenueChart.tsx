"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EChart } from "@/components/common/EChart";
import { MonthlyRevenueItem } from "@/lib/overviewApi";
import { useTheme } from "@/context/ThemeContext";
import {
  Table2,
  Copy,
  Check,
  X,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Database,
  Scale,
} from "lucide-react";
import * as echarts from "echarts";

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueItem[];
  period?: string;
  databaseQueried?: string;
}

const FULL_MONTH_NAMES: Record<string, string> = {
  Jan: "Januari",
  Feb: "Februari",
  Mar: "Maret",
  Apr: "April",
  Mei: "Mei",
  Jun: "Juni",
  Jul: "Juli",
  Agu: "Agustus",
  Sep: "September",
  Okt: "Oktober",
  Nov: "November",
  Des: "Desember",
};

export function MonthlyRevenueChart({
  data,
  period = "Jan–Sep 2026",
  databaseQueried = "APIdb, AGCdb, AGFdb",
}: MonthlyRevenueChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"fin" | "erp" | "recon">("fin");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);

  // Derive target year from period string (e.g. "Jan–Des 2025" -> "2025", "Semua Tahun" -> "Semua Tahun")
  const displayYear = useMemo(() => {
    if (period.includes("Semua Tahun") || period.includes("All Years")) {
      return "Semua Tahun";
    }
    const match = period.match(/\b(202\d)\b/);
    return match ? match[1] : "2026";
  }, [period]);

  // Status badge label on card header based on year
  const auditBadgeInfo = useMemo(() => {
    if (displayYear === "2026") {
      return {
        label: "✓ LK Disesuaikan",
        title: "Penyesuaian Laporan Keuangan 2026 (Eksklusi nota ERP-only & koreksi retur)",
      };
    }
    if (displayYear === "2025" || displayYear === "2024") {
      return {
        label: "✓ Finance Balanced",
        title: `Auto-balancing penyesuaian Laporan Keuangan resmi audit ${displayYear}`,
      };
    }
    return {
      label: "✓ LK Resmi",
      title: "Konsolidasi Laporan Keuangan Multi-Tahun",
    };
  }, [displayYear]);

  // 1. Financial Layer (LK) Statistics
  const totalFinRevenue = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.fin_revenue ?? curr.revenue ?? 0), 0);
  }, [data]);

  const totalFinRawRevenue = useMemo(() => {
    return data.reduce((acc, curr) => {
      const raw =
        curr.fin_raw_revenue ??
        (curr.raw_revenue != null && curr.raw_revenue > 0
          ? curr.raw_revenue
          : (curr.fin_revenue ?? curr.revenue ?? 0) * 1_000_000_000);
      return acc + raw;
    }, 0);
  }, [data]);

  const avgFinRevenue = useMemo(() => {
    return data.length > 0 ? totalFinRevenue / data.length : 0;
  }, [data, totalFinRevenue]);

  const maxFinItem: MonthlyRevenueItem = useMemo(() => {
    if (!data.length) return { month: "-", revenue: 0, label: "0" };
    return [...data].sort(
      (a, b) => (b.fin_revenue ?? b.revenue ?? 0) - (a.fin_revenue ?? a.revenue ?? 0)
    )[0];
  }, [data]);

  const minFinItem: MonthlyRevenueItem = useMemo(() => {
    const valid = data.filter((d) => (d.fin_revenue ?? d.revenue ?? 0) > 0);
    if (!valid.length) return { month: "-", revenue: 0, label: "0" };
    return [...valid].sort(
      (a, b) => (a.fin_revenue ?? a.revenue ?? 0) - (b.fin_revenue ?? b.revenue ?? 0)
    )[0];
  }, [data]);

  // 2. ERP Layer (Murni) Statistics
  const totalErpRevenue = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.erp_revenue ?? curr.revenue ?? 0), 0);
  }, [data]);

  const totalErpRawRevenue = useMemo(() => {
    return data.reduce((acc, curr) => {
      const raw =
        curr.erp_raw_revenue ??
        (curr.raw_revenue != null && curr.raw_revenue > 0
          ? curr.raw_revenue
          : (curr.erp_revenue ?? curr.revenue ?? 0) * 1_000_000_000);
      return acc + raw;
    }, 0);
  }, [data]);

  const avgErpRevenue = useMemo(() => {
    return data.length > 0 ? totalErpRevenue / data.length : 0;
  }, [data, totalErpRevenue]);

  const maxErpItem: MonthlyRevenueItem = useMemo(() => {
    if (!data.length) return { month: "-", revenue: 0, label: "0" };
    return [...data].sort(
      (a, b) => (b.erp_revenue ?? b.revenue ?? 0) - (a.erp_revenue ?? a.revenue ?? 0)
    )[0];
  }, [data]);

  // 3. Reconciliation & Variance Statistics
  const netVarianceRaw = useMemo(() => {
    return totalFinRawRevenue - totalErpRawRevenue;
  }, [totalFinRawRevenue, totalErpRawRevenue]);

  const netVarianceM = useMemo(() => {
    return totalFinRevenue - totalErpRevenue;
  }, [totalFinRevenue, totalErpRevenue]);

  // ECharts Option for Main Executive Chart
  const chartOption: echarts.EChartsOption = useMemo(() => {
    const months = data.map((d) => d.month);
    const revenues = data.map((d) => d.fin_revenue ?? d.revenue ?? 0);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: isDark ? "rgba(51, 65, 85, 0.25)" : "rgba(241, 245, 249, 0.75)",
          },
        },
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
        borderColor: isDark ? "#334155" : "#E2E8F0",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: isDark ? "#F8FAFC" : "#0F172A",
          fontSize: 12,
          fontFamily: "inherit",
        },
        extraCssText:
          "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 10px; backdrop-filter: blur(8px);",
        formatter: (params: any) => {
          const item = Array.isArray(params) ? params[0] : params;
          const monthIdx = item.dataIndex;
          const rowData = data[monthIdx];
          const fullMonth = FULL_MONTH_NAMES[item.name] || item.name;

          const finM = rowData?.fin_revenue ?? rowData?.revenue ?? Number(item.value || 0);
          const erpM = rowData?.erp_revenue ?? finM;
          const varRp = rowData?.variance_rp ?? 0;
          const varM = rowData?.variance_m ?? (finM - erpM);
          const isMatch = Math.abs(varRp) < 1;

          const finFormatted = finM.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const erpFormatted = erpM.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const varFormatted = Math.abs(varM).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          return `
            <div style="font-weight: 700; margin-bottom: 6px; color: ${
              isDark ? "#94A3B8" : "#64748B"
            }; font-size: 11px;">
              Bulan ${fullMonth} ${displayYear}
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${
                  isDark ? "#CBD5E1" : "#334155"
                }; font-weight: 600;">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #2563EB;"></span>
                  Laporan Keuangan (Resmi):
                </span>
                <span style="font-size: 13px; font-weight: 700; color: ${
                  isDark ? "#38BDF8" : "#1D4ED8"
                }; font-family: monospace;">
                  IDR ${finFormatted} M
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: ${
                  isDark ? "#94A3B8" : "#64748B"
                };">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #64748B;"></span>
                  Data Riil ERP (Murni):
                </span>
                <span style="font-size: 12px; font-weight: 600; color: ${
                  isDark ? "#CBD5E1" : "#475569"
                }; font-family: monospace;">
                  IDR ${erpFormatted} M
                </span>
              </div>
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed ${
                isDark ? "#334155" : "#E2E8F0"
              }; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                <span style="color: ${isDark ? "#94A3B8" : "#64748B"};">Status Rekonsiliasi:</span>
                <span style="font-weight: 700; color: ${
                  isMatch ? "#10B981" : varRp > 0 ? "#10B981" : "#F59E0B"
                }; font-family: monospace;">
                  ${
                    isMatch
                      ? "✓ Match 100%"
                      : varM > 0
                      ? `+${varFormatted} M`
                      : `-${varFormatted} M`
                  }
                </span>
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 36,
        right: 68,
        bottom: 12,
        left: 12,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        axisLine: {
          show: true,
          lineStyle: {
            color: isDark ? "#475569" : "#94A3B8",
            width: 1.5,
          },
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: isDark ? "#475569" : "#94A3B8",
          },
        },
        axisLabel: {
          color: isDark ? "#94A3B8" : "#64748B",
          fontSize: 11,
          fontWeight: 600,
          margin: 12,
        },
      },
      yAxis: {
        type: "value",
        name: "(IDR Miliar)",
        nameTextStyle: {
          color: isDark ? "#64748B" : "#94A3B8",
          fontSize: 10,
          align: "left",
          padding: [0, 0, 8, -6],
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: isDark ? "#475569" : "#94A3B8",
            width: 1.5,
          },
        },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? "#64748B" : "#94A3B8",
          fontSize: 10,
          fontFamily: "monospace",
          margin: 10,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed",
            color: isDark ? "rgba(51, 65, 85, 0.45)" : "rgba(203, 213, 225, 0.6)",
          },
        },
      },
      series: [
        {
          name: "Laporan Keuangan",
          type: "bar",
          data: revenues,
          barMaxWidth: 34,
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isDark ? "#38BDF8" : "#1D4ED8" },
              { offset: 1, color: isDark ? "rgba(30, 58, 138, 0.75)" : "#3B82F6" },
            ]),
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#60A5FA" },
                { offset: 1, color: "#2563EB" },
              ]),
              shadowBlur: 8,
              shadowColor: "rgba(37, 99, 235, 0.25)",
            },
          },
          label: {
            show: true,
            position: "top",
            distance: 6,
            color: isDark ? "#CBD5E1" : "#475569",
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "monospace",
            formatter: (params: any) => {
              const val = Number(params.value);
              return val > 0 ? val.toFixed(2).replace(".", ",") : "0,00";
            },
          },
          markLine: {
            symbol: "none",
            data: [
              {
                type: "average",
                name: "Rata-rata",
                lineStyle: {
                  type: "dashed",
                  color: isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(217, 119, 6, 0.9)",
                  width: 1.2,
                },
                label: {
                  show: true,
                  position: "end",
                  color: isDark ? "#FBBF24" : "#D97706",
                  fontSize: 10,
                  fontWeight: 600,
                  formatter: (params: any) =>
                    `Avg: ${Number(params.value).toFixed(2).replace(".", ",")} M`,
                },
              },
            ],
          },
          animationEasing: "cubicOut",
          animationDuration: 700,
        },
      ],
    };
  }, [data, isDark, displayYear]);

  // Export to Excel / Clipboard TSV
  const handleCopyTable = () => {
    let header = "";
    let rows = "";
    let summary = "";

    if (activeModalTab === "fin") {
      header = "No\tBulan Transaksi\tOmzet LK (IDR Miliar)\tNilai Faktur LK (Rp)\t% Kontribusi Total\tStatus Performa\n";
      rows = data
        .map((d, idx) => {
          const fullMonth = FULL_MONTH_NAMES[d.month] || d.month;
          const valM = (d.fin_revenue ?? d.revenue ?? 0).toFixed(2);
          const rawVal =
            d.fin_raw_revenue ??
            (d.raw_revenue != null && d.raw_revenue > 0
              ? d.raw_revenue
              : (d.fin_revenue ?? d.revenue ?? 0) * 1e9);
          const formattedRp = Number(rawVal).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const pct =
            totalFinRevenue > 0
              ? (((d.fin_revenue ?? d.revenue ?? 0) / totalFinRevenue) * 100).toFixed(1)
              : "0,0";
          const status =
            (d.fin_revenue ?? d.revenue ?? 0) === maxFinItem.revenue
              ? "Puncak ★"
              : (d.fin_revenue ?? d.revenue ?? 0) === minFinItem.revenue
              ? "Terendah"
              : "Stabil";
          return `${idx + 1}\t${fullMonth} ${displayYear}\tIDR ${valM} M\tRp ${formattedRp}\t${pct}%\t${status}`;
        })
        .join("\n");
      summary = `\nTotal\tTotal Laporan Keuangan (${displayYear})\tIDR ${totalFinRevenue.toFixed(2)} M\tRp ${Number(totalFinRawRevenue).toLocaleString("id-ID", { maximumFractionDigits: 2 })}\t100,0%\t✓ Terverifikasi LK`;
    } else if (activeModalTab === "erp") {
      header = "No\tBulan Transaksi\tOmzet ERP Murni (IDR Miliar)\tNilai Faktur ERP (Rp)\t% Kontribusi Total\tStatus Performa\n";
      rows = data
        .map((d, idx) => {
          const fullMonth = FULL_MONTH_NAMES[d.month] || d.month;
          const valM = (d.erp_revenue ?? d.revenue ?? 0).toFixed(2);
          const rawVal =
            d.erp_raw_revenue ??
            (d.raw_revenue != null && d.raw_revenue > 0
              ? d.raw_revenue
              : (d.erp_revenue ?? d.revenue ?? 0) * 1e9);
          const formattedRp = Number(rawVal).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const pct =
            totalErpRevenue > 0
              ? (((d.erp_revenue ?? d.revenue ?? 0) / totalErpRevenue) * 100).toFixed(1)
              : "0,0";
          const status =
            (d.erp_revenue ?? d.revenue ?? 0) === maxErpItem.revenue
              ? "Puncak ★"
              : "Stabil";
          return `${idx + 1}\t${fullMonth} ${displayYear}\tIDR ${valM} M\tRp ${formattedRp}\t${pct}%\t${status}`;
        })
        .join("\n");
      summary = `\nTotal\tTotal ERP Murni (${displayYear})\tIDR ${totalErpRevenue.toFixed(2)} M\tRp ${Number(totalErpRawRevenue).toLocaleString("id-ID", { maximumFractionDigits: 2 })}\t100,0%\t✓ Log Database ERP`;
    } else {
      // Tab 3: Rekonsiliasi & Varian Selisih (Spreadsheet Match)
      header = "No\tBulan Transaksi\tData Riil ERP (Rp)\tLaporan Keuangan (Rp)\tSelisih Varian (Rp)\t% Varian\tStatus Audit\n";
      rows = data
        .map((d, idx) => {
          const fullMonth = FULL_MONTH_NAMES[d.month] || d.month;
          const rawErp =
            d.erp_raw_revenue ??
            (d.raw_revenue != null && d.raw_revenue > 0
              ? d.raw_revenue
              : (d.erp_revenue ?? d.revenue ?? 0) * 1e9);
          const rawFin =
            d.fin_raw_revenue ??
            (d.raw_revenue != null && d.raw_revenue > 0
              ? d.raw_revenue
              : (d.fin_revenue ?? d.revenue ?? 0) * 1e9);
          const varRp = d.variance_rp ?? rawFin - rawErp;
          const pctVar = rawErp > 0 ? ((varRp / rawErp) * 100).toFixed(2) : "0,00";
          const formattedErp = Number(rawErp).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const formattedFin = Number(rawFin).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const formattedVar = Number(varRp).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const status =
            d.status ||
            (Math.abs(varRp) < 1
              ? "Match 100%"
              : varRp > 0
              ? "Penyesuaian (+)"
              : "Penyesuaian (-)");
          return `${idx + 1}\t${fullMonth} ${displayYear}\tRp ${formattedErp}\tRp ${formattedFin}\tRp ${formattedVar}\t${pctVar}%\t${status}`;
        })
        .join("\n");
      const formattedTotalErp = Number(totalErpRawRevenue).toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      });
      const formattedTotalFin = Number(totalFinRawRevenue).toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      });
      const formattedNetVar = Number(netVarianceRaw).toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      });
      const netPct =
        totalErpRawRevenue > 0
          ? ((netVarianceRaw / totalErpRawRevenue) * 100).toFixed(2)
          : "0,00";
      const totalStatus =
        Math.abs(netVarianceRaw) < 1 ? "Match 100% (Sesuai)" : "Terekonsiliasi (Balanced)";
      summary = `\nTotal\tKonsolidasi (${displayYear})\tRp ${formattedTotalErp}\tRp ${formattedTotalFin}\tRp ${formattedNetVar}\t${netPct}%\t${totalStatus}`;
    }

    navigator.clipboard.writeText(header + rows + summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Main Chart Card (Clean, Focused, Enterprise Grade) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
        {/* Header: Judul Kiri, Controls Kanan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Tren Realisasi Penjualan Bulanan
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live SQL
              </span>
              <span
                title={auditBadgeInfo.title}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shrink-0"
              >
                <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                {auditBadgeInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {period} · Konsolidasi {databaseQueried}
            </p>
          </div>

          {/* Right Controls: Exactly Matched Height (h-9 / 36px) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Stat Badge */}
            <div className="h-9 px-3 rounded-lg flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs select-none">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Total LK:
              </span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                IDR {totalFinRevenue.toFixed(2).replace(".", ",")} M
              </span>
            </div>

            {/* Button to open Full Audit Table Modal */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              title="Buka Tabel Rincian Rekonsiliasi & Audit Lengkap"
              className="h-9 px-3.5 rounded-lg flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Table2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Rincian Data</span>
            </button>
          </div>
        </div>

        {/* ECharts Canvas (Spacious, Perfectly Centered) */}
        <div className="h-64 sm:h-72 w-full pt-1">
          <EChart option={chartOption} />
        </div>
      </div>

      {/* =========================================================================
          MODAL AUDIT DATA: DUAL-LAYER & SPREADSHEET RECONCILIATION
          ========================================================================= */}
      {isModalOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      Rincian Audit Realisasi Penjualan Bulanan
                    </h3>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Live SQL (Konsolidasi {displayYear})
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Dual-Layer Architecture
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Agregasi transaksi penjualan komersial dari {databaseQueried} (Sesuai standarisasi laporan keuangan audit)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  title="Tutup (Esc)"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 3-Tab Layer Navigation Bar (Sequential: Tab 1 -> Tab 2 -> Tab 3 in a sleek single-line container) */}
              <div className="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 overflow-x-auto">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 w-fit shrink-0">
                  {/* Tab 1: Laporan Keuangan (Default Active) */}
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("fin")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                      activeModalTab === "fin"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Tab 1: Laporan Keuangan</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        activeModalTab === "fin"
                          ? "bg-blue-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      Resmi
                    </span>
                  </button>

                  {/* Tab 2: Data Riil ERP */}
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("erp")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                      activeModalTab === "erp"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Tab 2: Data Riil ERP</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        activeModalTab === "erp"
                          ? "bg-blue-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      Murni
                    </span>
                  </button>

                  {/* Tab 3: Rekonsiliasi & Varian */}
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("recon")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                      activeModalTab === "recon"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span>Tab 3: Rekonsiliasi & Varian</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        activeModalTab === "recon"
                          ? "bg-blue-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      Audit Delta
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Compact Dynamic Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3">
                {activeModalTab === "recon" ? (
                  <>
                    {/* Card 1: Total Laporan Keuangan */}
                    <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                          Total Laporan Keuangan ({displayYear})
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-blue-900 dark:text-blue-300 block truncate">
                          IDR {totalFinRevenue.toFixed(2).replace(".", ",")} M
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Total Data Riil ERP */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Database className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                          Total Data Riil ERP ({displayYear})
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-slate-800 dark:text-slate-200 block truncate">
                          IDR {totalErpRevenue.toFixed(2).replace(".", ",")} M
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Net Selisih Rekonsiliasi */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Scale className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                          Net Varian Selisih (LK vs ERP)
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-emerald-900 dark:text-emerald-300 block truncate">
                          {Math.abs(netVarianceRaw) < 1
                            ? "Rp 0,00 (Match 100%)"
                            : `${netVarianceRaw > 0 ? "+" : ""}IDR ${netVarianceM
                                .toFixed(2)
                                .replace(".", ",")} M`}
                        </span>
                      </div>
                    </div>
                  </>
                ) : activeModalTab === "fin" ? (
                  <>
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100/80 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                          Total Realisasi LK ({displayYear})
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                          IDR {totalFinRevenue.toFixed(2).replace(".", ",")} M
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                          Rata-rata per Bulan
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-amber-900 dark:text-amber-300">
                          IDR {avgFinRevenue.toFixed(2).replace(".", ",")} M
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                          Bulan Penjualan Puncak
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-emerald-900 dark:text-emerald-300">
                          {FULL_MONTH_NAMES[maxFinItem.month] || maxFinItem.month} (
                          {(maxFinItem.fin_revenue ?? maxFinItem.revenue ?? 0)
                            .toFixed(2)
                            .replace(".", ",")}{" "}
                          M)
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                          Total Realisasi ERP ({displayYear})
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                          IDR {totalErpRevenue.toFixed(2).replace(".", ",")} M
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                          Rata-rata per Bulan
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-amber-900 dark:text-amber-300">
                          IDR {avgErpRevenue.toFixed(2).replace(".", ",")} M
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                          Bulan Penjualan Puncak
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-emerald-900 dark:text-emerald-300">
                          {FULL_MONTH_NAMES[maxErpItem.month] || maxErpItem.month} (
                          {(maxErpItem.erp_revenue ?? maxErpItem.revenue ?? 0)
                            .toFixed(2)
                            .replace(".", ",")}{" "}
                          M)
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Table Area: Fully Visible, Zero Scrollbar Disruption, Harmonized Font */}
              <div className="px-6 py-1 overflow-y-auto flex-1">
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                  {/* TAB 3: REKONSILIASI & VARIAN SELISIH (Spreadsheet Match) */}
                  {activeModalTab === "recon" && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-12">No</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Bulan Transaksi</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Data Riil ERP (Rupiah)</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Laporan Keuangan (Rupiah)</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Selisih Varian (LK - ERP)</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">% Varian</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-36">Status Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                        {data.map((item, idx) => {
                          const fullMonth = FULL_MONTH_NAMES[item.month] || item.month;
                          const rawErp =
                            item.erp_raw_revenue ??
                            (item.raw_revenue != null && item.raw_revenue > 0
                              ? item.raw_revenue
                              : (item.erp_revenue ?? item.revenue ?? 0) * 1e9);
                          const rawFin =
                            item.fin_raw_revenue ??
                            (item.raw_revenue != null && item.raw_revenue > 0
                              ? item.raw_revenue
                              : (item.fin_revenue ?? item.revenue ?? 0) * 1e9);
                          const varRp = item.variance_rp ?? rawFin - rawErp;
                          const pctVar =
                            rawErp > 0 ? ((varRp / rawErp) * 100).toFixed(2) : "0,00";
                          const isMatch = Math.abs(varRp) < 1;

                          const formattedErp = Number(rawErp).toLocaleString("id-ID", {
                            minimumFractionDigits: rawErp % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          });
                          const formattedFin = Number(rawFin).toLocaleString("id-ID", {
                            minimumFractionDigits: rawFin % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          });
                          const formattedVar = Number(Math.abs(varRp)).toLocaleString("id-ID", {
                            minimumFractionDigits: varRp % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          });

                          return (
                            <tr
                              key={item.month}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors even:bg-slate-50/30 dark:even:bg-slate-800/20"
                            >
                              <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-sans">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {fullMonth} {displayYear}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                Rp {formattedErp}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                Rp {formattedFin}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                                  isMatch
                                    ? "text-slate-400 dark:text-slate-500"
                                    : varRp > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {isMatch
                                  ? "Rp 0,00"
                                  : `${varRp > 0 ? "+ " : "- "}Rp ${formattedVar}`}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-medium whitespace-nowrap ${
                                  isMatch
                                    ? "text-slate-400"
                                    : varRp > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {isMatch ? "0,0%" : `${varRp > 0 ? "+" : ""}${pctVar.replace(".", ",")}%`}
                              </td>
                              <td className="py-2 px-3 text-center font-sans whitespace-nowrap">
                                {isMatch ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    ✓ Match 100%
                                  </span>
                                ) : varRp > 0 ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                    Penyesuaian (+)
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                    Penyesuaian (-)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50/95 dark:bg-slate-800/95 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10 shadow-2xs">
                        <tr>
                          <td colSpan={2} className="py-2.5 px-3 font-sans text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            Total Konsolidasi ({displayYear})
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                            Rp{" "}
                            {Number(totalErpRawRevenue).toLocaleString("id-ID", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-700 dark:text-blue-400 text-xs whitespace-nowrap">
                            Rp{" "}
                            {Number(totalFinRawRevenue).toLocaleString("id-ID", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap text-emerald-700 dark:text-emerald-400">
                            {Math.abs(netVarianceRaw) < 1
                              ? "Rp 0,00"
                              : `${netVarianceRaw > 0 ? "+" : "-"}Rp ${Number(
                                  Math.abs(netVarianceRaw)
                                ).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                            {totalErpRawRevenue > 0
                              ? ((netVarianceRaw / totalErpRawRevenue) * 100)
                                  .toFixed(2)
                                  .replace(".", ",")
                              : "0,00"}
                            %
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs text-emerald-600 dark:text-emerald-400 font-sans font-semibold whitespace-nowrap w-36">
                            {Math.abs(netVarianceRaw) < 1 ? "✓ Klop Sempurna" : "✓ Balanced Target"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* TAB 1: LAPORAN KEUANGAN (Adjusted / Auto-Balanced) */}
                  {activeModalTab === "fin" && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-12">No</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Bulan Transaksi</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Omzet LK (IDR Miliar)</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Nilai Faktur LK (Rupiah)</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">% Kontribusi Total</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-36">Status Performa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                        {data.map((item, idx) => {
                          const fullMonth = FULL_MONTH_NAMES[item.month] || item.month;
                          const finVal = item.fin_revenue ?? item.revenue ?? 0;
                          const isMax = finVal === maxFinItem.revenue && maxFinItem.revenue > 0;
                          const isMin = finVal === minFinItem.revenue && minFinItem.revenue > 0;
                          const pct =
                            totalFinRevenue > 0
                              ? ((finVal / totalFinRevenue) * 100).toFixed(1)
                              : "0,0";

                          const rawVal =
                            item.fin_raw_revenue ??
                            (item.raw_revenue != null && item.raw_revenue > 0
                              ? item.raw_revenue
                              : finVal * 1e9);
                          const formattedRp = Number(rawVal).toLocaleString("id-ID", {
                            minimumFractionDigits: rawVal % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          });

                          return (
                            <tr
                              key={item.month}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors even:bg-slate-50/30 dark:even:bg-slate-800/20"
                            >
                              <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-sans">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {fullMonth} {displayYear}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {finVal.toFixed(2).replace(".", ",")} M
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                Rp {formattedRp}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {pct.replace(".", ",")}%
                              </td>
                              <td className="py-2 px-3 text-center font-sans whitespace-nowrap">
                                {isMax ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    Puncak ★
                                  </span>
                                ) : isMin ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                    Terendah
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Stabil</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50/95 dark:bg-slate-800/95 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10 shadow-2xs">
                        <tr>
                          <td colSpan={2} className="py-2.5 px-3 font-sans text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            Total Laporan Keuangan ({displayYear})
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                            {totalFinRevenue.toFixed(2).replace(".", ",")} M
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">
                            Rp{" "}
                            {Number(totalFinRawRevenue).toLocaleString("id-ID", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-slate-100 text-sm whitespace-nowrap">
                            100,0%
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs text-emerald-600 dark:text-emerald-400 font-sans font-semibold whitespace-nowrap w-36">
                            ✓ Terverifikasi LK
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* TAB 2: DATA RIIL ERP (Murni / Raw) */}
                  {activeModalTab === "erp" && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-12">No</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Bulan Transaksi</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Omzet ERP Murni (IDR Miliar)</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Nilai Faktur ERP (Rupiah)</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">% Kontribusi Total</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-36">Status Performa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                        {data.map((item, idx) => {
                          const fullMonth = FULL_MONTH_NAMES[item.month] || item.month;
                          const erpVal = item.erp_revenue ?? item.revenue ?? 0;
                          const isMax = erpVal === maxErpItem.revenue && maxErpItem.revenue > 0;
                          const pct =
                            totalErpRevenue > 0
                              ? ((erpVal / totalErpRevenue) * 100).toFixed(1)
                              : "0,0";

                          const rawVal =
                            item.erp_raw_revenue ??
                            (item.raw_revenue != null && item.raw_revenue > 0
                              ? item.raw_revenue
                              : erpVal * 1e9);
                          const formattedRp = Number(rawVal).toLocaleString("id-ID", {
                            minimumFractionDigits: rawVal % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          });

                          return (
                            <tr
                              key={item.month}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors even:bg-slate-50/30 dark:even:bg-slate-800/20"
                            >
                              <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-sans">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {fullMonth} {displayYear}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {erpVal.toFixed(2).replace(".", ",")} M
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                Rp {formattedRp}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {pct.replace(".", ",")}%
                              </td>
                              <td className="py-2 px-3 text-center font-sans whitespace-nowrap">
                                {isMax ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    Puncak ★
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Stabil</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50/95 dark:bg-slate-800/95 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10 shadow-2xs">
                        <tr>
                          <td colSpan={2} className="py-2.5 px-3 font-sans text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            Total ERP Murni ({displayYear})
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">
                            {totalErpRevenue.toFixed(2).replace(".", ",")} M
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">
                            Rp{" "}
                            {Number(totalErpRawRevenue).toLocaleString("id-ID", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-slate-100 text-sm whitespace-nowrap">
                            100,0%
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs text-blue-600 dark:text-blue-400 font-sans font-semibold whitespace-nowrap w-36">
                            ✓ Log Database ERP
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                  {activeModalTab === "recon"
                    ? "Tabel audit rekonsiliasi menyajikan analisis varian transaksi antara catatan database ERP dan target laporan keuangan resmi audit akhir tahun."
                    : activeModalTab === "fin"
                    ? "Data Laporan Keuangan resmi mencerminkan angka realisasi penjualan audited yang disahkan untuk manajemen dan pemegang saham."
                    : "Data Riil ERP menampilkan agregasi faktur mentah apa adanya langsung dari database SQL Server untuk kebutuhan operasional IT dan stok logistik."}
                </span>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyTable}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap select-none"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-white shrink-0" />
                        <span className="whitespace-nowrap font-medium">
                          Berhasil Tersalin ke Clipboard!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-white shrink-0" />
                        <span className="whitespace-nowrap font-medium">
                          Salin Semua ke Excel (CSV)
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap select-none"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
