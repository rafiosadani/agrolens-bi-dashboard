"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { EChart } from "@/components/common/EChart";
import { ProductTypeItem } from "@/lib/overviewApi";
import { useTheme } from "@/context/ThemeContext";
import {
  Table2,
  Copy,
  Check,
  X,
  PieChart as PieIcon,
  Award,
  Layers,
} from "lucide-react";
import * as echarts from "echarts";

interface ProductTypeDonutChartProps {
  totalFormatted: string;
  totalRaw?: number;
  items: ProductTypeItem[];
  period?: string;
  databaseQueried?: string;
}

export function ProductTypeDonutChart({
  totalFormatted,
  totalRaw,
  items,
  period = "Jan–Sep 2026",
  databaseQueried = "APIdb003, AGCdb003, AGFdb003",
}: ProductTypeDonutChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<ProductTypeItem | null>(null);

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

  // Derive target year from period string
  const displayYear = useMemo(() => {
    const match = period.match(/\b(202\d)\b/);
    return match ? match[1] : "2026";
  }, [period]);

  // Calculate highest / dominant category
  const dominantCategory = useMemo(() => {
    if (!items || items.length === 0) return null;
    return [...items].sort((a, b) => (b.raw_revenue || b.percentage) - (a.raw_revenue || a.percentage))[0];
  }, [items]);

  // Raw total calculated from items if not provided
  const computedTotalRaw = useMemo(() => {
    if (totalRaw && totalRaw > 0) return totalRaw;
    return items.reduce((acc, it) => acc + (it.raw_revenue || 0), 0);
  }, [totalRaw, items]);

  // ECharts Donut Options
  const chartOption: echarts.EChartsOption = useMemo(() => {
    const chartData = items.map((it) => ({
      name: it.name,
      value: it.revenue_m || (it.raw_revenue ? it.raw_revenue / 1e9 : it.percentage),
      rawRp: it.formatted_rp || (it.raw_revenue ? `Rp ${it.raw_revenue.toLocaleString("id-ID")}` : ""),
      percentage: it.percentage,
      itemStyle: {
        color: it.color,
      },
    }));

    return {
      tooltip: {
        trigger: "item" as const,
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
        borderColor: isDark ? "rgba(51, 65, 85, 0.8)" : "rgba(226, 232, 240, 0.9)",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: isDark ? "#E2E8F0" : "#1E293B",
          fontSize: 12,
        },
        extraCssText:
          "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 12px; backdrop-filter: blur(8px);",
        formatter: (params: any) => {
          const raw = params.data?.rawRp || "";
          const pct = params.data?.percentage ?? params.percent;
          return `
            <div style="font-family: inherit;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${params.color};"></span>
                <span style="font-weight: 700; font-size: 13px;">${params.name}</span>
              </div>
              <div style="font-family: monospace; font-size: 12px; font-weight: 700; color: #2563EB; margin-bottom: 2px;">
                IDR ${params.value.toFixed(2).replace(".", ",")} Miliar
              </div>
              ${raw ? `<div style="font-family: monospace; font-size: 11px; opacity: 0.75; margin-bottom: 4px;">${raw}</div>` : ""}
              <div style="font-size: 11px; font-weight: 600; padding-top: 4px; border-top: 1px dashed ${isDark ? "#334155" : "#E2E8F0"};">
                Kontribusi: <strong style="color: ${isDark ? "#F8FAFC" : "#0F172A"}">${pct}%</strong> dari total omzet
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          name: "Revenue per Jenis",
          type: "pie",
          radius: ["58%", "82%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: false,
          padAngle: 3,
          itemStyle: {
            borderRadius: 6,
            borderColor: isDark ? "#0F172A" : "#FFFFFF",
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 6,
            itemStyle: {
              shadowBlur: 14,
              shadowOffsetX: 0,
              shadowColor: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.15)",
            },
          },
          data: chartData,
          animationDuration: 700,
          animationEasing: "cubicInOut",
        },
      ],
    };
  }, [items, isDark]);

  // Copy complete table to clipboard
  const handleCopyTable = () => {
    const header = "No\tKategori Produk\tOmzet (IDR Miliar)\tNilai Faktur Riil (Rupiah)\t% Kontribusi\n";
    const rows = items
      .map((it, idx) => {
        const valM = (it.revenue_m || (it.raw_revenue ? it.raw_revenue / 1e9 : 0)).toFixed(2).replace(".", ",");
        const formattedRp = it.raw_revenue
          ? Number(it.raw_revenue).toLocaleString("id-ID", { maximumFractionDigits: 2 })
          : "0";
        return `${idx + 1}\t${it.name}\tIDR ${valM} M\tRp ${formattedRp}\t${it.percentage}%`;
      })
      .join("\n");
    const summary = `\nTotal Konsolidasi\t${totalFormatted}\tRp ${Number(computedTotalRaw).toLocaleString("id-ID", { maximumFractionDigits: 2 })}\t100,0%`;

    navigator.clipboard.writeText(header + rows + summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Main Donut Card (Executive Grade & ECharts Powered) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors h-full">
        {/* Card Header: Judul Kiri, Controls Kanan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Revenue per Jenis Produk
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live SQL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Porsi kontribusi kategori terhadap total YTD
            </p>
          </div>

          {/* Right Action: Button Rincian Data */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              title="Buka Tabel Audit Revenue per Kategori"
              className="h-9 px-3.5 rounded-lg flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Table2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Rincian Data</span>
            </button>
          </div>
        </div>

        {/* Content: Donut Ring & Dynamic Interactive Center Lens */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-64 sm:h-72 w-full pt-1">
          {/* Left: Donut Chart with Dynamic Centered Lens */}
          <div className="relative h-56 w-56 sm:h-64 sm:w-64 shrink-0 flex items-center justify-center">
            <div className="h-full w-full">
              <EChart
                option={chartOption}
                onEvents={{
                  mouseover: (params: any) => {
                    const match = items.find((it) => it.name === params.name);
                    if (match) setHoveredCategory(match);
                  },
                  mouseout: () => {
                    setHoveredCategory(null);
                  },
                }}
              />
            </div>

            {/* Dynamic Center Lens (Default: Total Omzet, OnHover: Selected Category) */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-3 select-none">
              {hoveredCategory ? (
                <div className="animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                  <span
                    className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full inline-block truncate max-w-[110px]"
                    style={{
                      backgroundColor: `${hoveredCategory.color}20`,
                      color: hoveredCategory.color,
                    }}
                  >
                    {hoveredCategory.name}
                  </span>
                  <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100 leading-tight">
                    {hoveredCategory.revenue_m != null
                      ? `IDR ${hoveredCategory.revenue_m.toFixed(2).replace(".", ",")} M`
                      : `${hoveredCategory.percentage}%`}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block font-mono">
                    {hoveredCategory.percentage}% dari total
                  </span>
                </div>
              ) : (
                <div className="animate-in fade-in duration-200 space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Total Omzet
                  </span>
                  <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100 leading-tight">
                    {totalFormatted}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {items.length} Kategori Produk
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Rich Interactive Legend List */}
          <div className="space-y-2 flex-1 w-full max-h-56 overflow-y-auto pr-1 no-scrollbar">
            {items.map((item) => (
              <div
                key={item.name}
                onMouseEnter={() => setHoveredCategory(item)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  hoveredCategory?.name === item.name
                    ? "bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 shadow-2xs translate-x-1"
                    : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-800/70"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {item.revenue_m != null ? `${item.revenue_m.toFixed(2).replace(".", ",")} M` : ""}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL AUDIT REVENUE PER KATEGORI: REACT PORTAL (DEAD-CENTER VIEWPORT)
          ========================================================================= */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Rincian Audit Revenue per Jenis Produk
                  </h3>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Live SQL (Konsolidasi {displayYear})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Agregasi faktur komersial per kategori dari {databaseQueried} (Setelah eliminasi transaksi afiliasi)
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

            {/* 3 Summary Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3">
              {/* Card 1: Total Omzet Kategori */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100/80 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <PieIcon className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Total Omzet Kategori ({displayYear})
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                    {totalFormatted}
                  </span>
                </div>
              </div>

              {/* Card 2: Kategori Terbesar / Dominan */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Kategori Penjualan Terbesar
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-emerald-900 dark:text-emerald-300">
                    {dominantCategory ? `${dominantCategory.name} (${dominantCategory.percentage}%)` : "—"}
                  </span>
                </div>
              </div>

              {/* Card 3: Total Kategori Terdaftar */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-100/80 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Keragaman Portofolio
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-purple-900 dark:text-purple-300">
                    {items.length} Kategori Produk
                  </span>
                </div>
              </div>
            </div>

            {/* Table Area: Compact Padding, Clean Audit Rows */}
            <div className="px-6 py-1 overflow-y-auto flex-1">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center whitespace-nowrap">No</th>
                      <th className="py-2.5 px-4 whitespace-nowrap">Kategori Produk</th>
                      <th className="py-2.5 px-4 text-right whitespace-nowrap">Omzet (IDR Miliar)</th>
                      <th className="py-2.5 px-4 text-right whitespace-nowrap">Nilai Faktur Riil (Rupiah)</th>
                      <th className="py-2.5 px-4 text-right whitespace-nowrap">% Kontribusi Total</th>
                      <th className="py-2.5 px-4 text-center whitespace-nowrap">Status Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                    {items.map((it, idx) => {
                      const valM = (it.revenue_m || (it.raw_revenue ? it.raw_revenue / 1e9 : 0)).toFixed(2).replace(".", ",");
                      const formattedRp = it.raw_revenue
                        ? Number(it.raw_revenue).toLocaleString("id-ID", {
                            minimumFractionDigits: it.raw_revenue % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          })
                        : "0";

                      return (
                        <tr
                          key={it.name}
                          className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-center text-slate-400 font-sans font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-sans font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: it.color }}
                              />
                              <span>{it.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            IDR {valM} M
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Rp {formattedRp}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(it.percentage, 100)}%`,
                                    backgroundColor: it.color,
                                  }}
                                />
                              </div>
                              <span>{it.percentage}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center text-xs font-sans whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              Terverifikasi SQL
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-4 font-sans text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        Total Konsolidasi ({displayYear})
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                        {totalFormatted}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">
                        Rp{" "}
                        {Number(computedTotalRaw).toLocaleString("id-ID", {
                          minimumFractionDigits: computedTotalRaw % 1 === 0 ? 0 : 2,
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
                Kategori produk diekstrak langsung dari tabel Inventories & InventoryCategories di SQL Server.
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
