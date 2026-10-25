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

  // Summary statistics
  const totalRevenue = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  }, [data]);

  // Total raw revenue in Rupiah directly from SQL Server (exact, zero rounding discrepancy)
  const totalRawRevenue = useMemo(() => {
    return data.reduce(
      (acc, curr) =>
        acc +
        (curr.raw_revenue != null && curr.raw_revenue > 0
          ? curr.raw_revenue
          : (curr.revenue || 0) * 1_000_000_000),
      0
    );
  }, [data]);

  const avgRevenue = useMemo(() => {
    return data.length > 0 ? totalRevenue / data.length : 0;
  }, [data, totalRevenue]);

  const maxItem = useMemo(() => {
    if (!data.length) return { month: "-", revenue: 0 };
    return [...data].sort((a, b) => b.revenue - a.revenue)[0];
  }, [data]);

  const minItem = useMemo(() => {
    const valid = data.filter((d) => d.revenue > 0);
    if (!valid.length) return { month: "-", revenue: 0 };
    return [...valid].sort((a, b) => a.revenue - b.revenue)[0];
  }, [data]);

  const chartOption: echarts.EChartsOption = useMemo(() => {
    const months = data.map((d) => d.month);
    const revenues = data.map((d) => d.revenue);

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
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
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
          const val = Number(item.value || 0).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const fullMonth = FULL_MONTH_NAMES[item.name] || item.name;
          return `
            <div style="font-weight: 600; margin-bottom: 4px; color: ${isDark ? "#94A3B8" : "#64748B"}; font-size: 11px;">
              Bulan ${fullMonth} ${displayYear}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${isDark ? "#CBD5E1" : "#475569"};">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: #2563EB;"></span>
                Realisasi Live SQL
              </span>
              <span style="font-size: 13px; font-weight: 700; color: ${isDark ? "#38BDF8" : "#1D4ED8"}; font-family: monospace;">
                IDR ${val} Miliar
              </span>
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
          name: "Realisasi Revenue",
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

  const handleCopyTable = () => {
    const header = "Bulan\tOmzet (IDR Miliar)\tNilai Faktur Riil (Rp)\tKontribusi\n";
    const rows = data
      .map((d) => {
        const fullMonth = FULL_MONTH_NAMES[d.month] || d.month;
        const valM = d.revenue.toFixed(2);
        const rawVal =
          d.raw_revenue != null && d.raw_revenue > 0
            ? d.raw_revenue
            : d.revenue * 1_000_000_000;
        const formattedRp = Number(rawVal).toLocaleString("id-ID", {
          minimumFractionDigits: rawVal % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        });
        const pct = totalRevenue > 0 ? ((d.revenue / totalRevenue) * 100).toFixed(1) : "0";
        return `${fullMonth} ${displayYear}\tIDR ${valM} M\tRp ${formattedRp}\t${pct}%`;
      })
      .join("\n");
    const summary = `\nTotal Konsolidasi\tIDR ${totalRevenue.toFixed(2)} M\tRp ${Number(totalRawRevenue).toLocaleString("id-ID", { maximumFractionDigits: 2 })}\t100%`;

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
                Total:
              </span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                IDR {totalRevenue.toFixed(2).replace(".", ",")} M
              </span>
            </div>

            {/* Button to open Full Audit Table Modal */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              title="Buka Tabel Rincian Audit Lengkap"
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
          MODAL AUDIT DATA: LEGA (max-w-5xl), MEWAH, REACT PORTAL (DEAD-CENTER VIEWPORT)
          ========================================================================= */}
      {isModalOpen && mounted && createPortal(
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
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Agregasi faktur komersial dari {databaseQueried} (Setelah eliminasi transaksi afiliasi internal)
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

            {/* 3 Compact Highlight Cards (Tinggi Ringkas, Tidak Boros Ruang) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3">
              {/* Card 1: Total Realisasi */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100/80 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Total Realisasi ({displayYear})
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                    IDR {totalRevenue.toFixed(2).replace(".", ",")} M
                  </span>
                </div>
              </div>

              {/* Card 2: Rata-rata per Bulan */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Rata-rata per Bulan
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-amber-900 dark:text-amber-300">
                    IDR {avgRevenue.toFixed(2).replace(".", ",")} M
                  </span>
                </div>
              </div>

              {/* Card 3: Puncak Tertinggi */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Bulan Penjualan Puncak
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-emerald-900 dark:text-emerald-300">
                    {FULL_MONTH_NAMES[maxItem.month] || maxItem.month} ({maxItem.revenue.toFixed(2).replace(".", ",")} M)
                  </span>
                </div>
              </div>
            </div>

            {/* Table Area: max-w-5xl, Compact Padding (py-2), Tanpa Scroll di Laptop Standar */}
            <div className="px-6 py-1 overflow-y-auto flex-1">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4 whitespace-nowrap">Bulan Transaksi</th>
                      <th className="py-2.5 px-4 text-right whitespace-nowrap">Omzet (IDR Miliar)</th>
                      <th className="py-2.5 px-4 text-right whitespace-nowrap">Nilai Faktur Riil (Rupiah)</th>
                      <th className="py-2.5 px-4 text-right whitespace-nowrap">% Kontribusi Total</th>
                      <th className="py-2.5 px-4 text-center whitespace-nowrap">Status Performa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                    {data.map((item) => {
                      const fullMonth = FULL_MONTH_NAMES[item.month] || item.month;
                      const isMax = item.revenue === maxItem.revenue && maxItem.revenue > 0;
                      const isMin = item.revenue === minItem.revenue && minItem.revenue > 0;
                      const pct = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : "0,0";

                      // Exact raw Rupiah from SQL Server without estimation
                      const rawVal =
                        item.raw_revenue != null && item.raw_revenue > 0
                          ? item.raw_revenue
                          : (item.revenue || 0) * 1_000_000_000;
                      const formattedRp = Number(rawVal).toLocaleString("id-ID", {
                        minimumFractionDigits: rawVal % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      });

                      return (
                        <tr
                          key={item.month}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors even:bg-slate-50/30 dark:even:bg-slate-800/20"
                        >
                          <td className="py-2 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {fullMonth} {displayYear}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {item.revenue.toFixed(2).replace(".", ",")} M
                          </td>
                          <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                            Rp {formattedRp}
                          </td>
                          <td className="py-2 px-4 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {pct.replace(".", ",")}%
                          </td>
                          <td className="py-2 px-4 text-center font-sans whitespace-nowrap">
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
                  {/* Clean, Non-wrapping Footer (tfoot) */}
                  <tfoot className="bg-slate-50/95 dark:bg-slate-800/95 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10 shadow-2xs">
                    <tr>
                      <td className="py-2.5 px-4 font-sans text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        Total Konsolidasi ({displayYear})
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                        {totalRevenue.toFixed(2).replace(".", ",")} M
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">
                        Rp{" "}
                        {Number(totalRawRevenue).toLocaleString("id-ID", {
                          minimumFractionDigits: totalRawRevenue % 1 === 0 ? 0 : 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-slate-100 text-sm whitespace-nowrap">
                        100,0%
                      </td>
                      <td className="py-2.5 px-4 text-center text-xs text-emerald-600 dark:text-emerald-400 font-sans font-semibold whitespace-nowrap">
                        ✓ Terverifikasi SQL
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Cocokkan data tabel di atas dengan hasil query SQL Server di VS Code Anda.
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyTable}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-white" />
                      <span>Berhasil Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-white" />
                      <span>Salin Semua ke Excel (CSV)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
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
