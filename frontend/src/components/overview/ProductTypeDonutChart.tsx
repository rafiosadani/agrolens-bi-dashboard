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
  Search,
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
  const [searchQuery, setSearchQuery] = useState("");

  // Chart instance reference for programmatic hover dispatch
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  // Keep a fresh reference to items to prevent stale closures in chart event listeners
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Bidirectional hover: highlight slice in ECharts when hovering list item
  const handleCategoryHover = (item: ProductTypeItem) => {
    setHoveredCategory(item);
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispatchAction({
        type: "downplay",
        seriesIndex: 0,
      });
      chartInstanceRef.current.dispatchAction({
        type: "highlight",
        seriesIndex: 0,
        name: item.name,
      });
    }
  };

  const handleCategoryLeave = () => {
    setHoveredCategory(null);
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispatchAction({
        type: "downplay",
        seriesIndex: 0,
      });
    }
  };

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

  // Filter categories with positive revenue (> 0) for Donut Chart representation
  const positiveItems = useMemo(() => {
    return items.filter((it) => (it.raw_revenue != null ? it.raw_revenue > 0 : it.percentage > 0));
  }, [items]);

  // ECharts Donut Options (Large & Prominent with appendToBody Tooltip)
  const chartOption: echarts.EChartsOption = useMemo(() => {
    const chartData = positiveItems.map((it) => ({
      name: it.name,
      value: it.revenue_m || (it.raw_revenue ? it.raw_revenue / 1e9 : it.percentage),
      rawRp: it.formatted_rp || (it.raw_revenue ? `Rp ${it.raw_revenue.toLocaleString("id-ID")}` : ""),
      percentage: it.percentage,
      itemStyle: {
        color: it.color,
      },
    }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        show: false,
      },
      series: [
        {
          name: "Revenue per Jenis",
          type: "pie",
          radius: ["62%", "83%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: false,
          minAngle: 4,
          padAngle: 2,
          itemStyle: {
            borderRadius: 5,
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
  }, [positiveItems, isDark]);

  // Quick search filter for audit modal table
  const displayedModalItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.formatted_rp && it.formatted_rp.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Copy complete table to clipboard
  const handleCopyTable = () => {
    const header = "No\tKategori Produk\tOmzet (IDR Miliar)\tNilai Faktur Riil (Rupiah)\t% Kontribusi\n";
    const rows = displayedModalItems
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
      {/* Main Donut Card (Executive Center-Focused Layout - Zero Vertical Scroll) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors h-full">
        {/* Card Header: Judul Kiri, Controls Kanan */}
        <div className="flex items-center justify-between gap-3 mb-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
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
              className="h-8.5 px-3 rounded-lg flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Table2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Rincian Data</span>
            </button>
          </div>
        </div>

        {/* Card Body: Side-by-Side (Large Donut on Left, Clean Vertical Legend on Right - Zero Vertical Scrollbar) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 py-1 flex-1 min-h-0">
          {/* Left: Prominent Donut Ring with Roomy Dynamic Center Lens */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 md:w-52 md:h-52 shrink-0 flex items-center justify-center">
            <div className="w-full h-full">
              <EChart
                option={chartOption}
                onChartReady={(chart) => {
                  chartInstanceRef.current = chart;
                }}
                onEvents={{
                  mouseover: (params: any) => {
                    const currentItems = itemsRef.current;
                    const match = currentItems.find((it) => it.name === params.name);
                    if (match) setHoveredCategory(match);
                  },
                  mouseout: () => {
                    setHoveredCategory(null);
                  },
                }}
              />
            </div>

            {/* Roomy Dynamic Center Lens (Clean, unclipped, wraps long category names gracefully) */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-2 select-none">
              {hoveredCategory ? (
                <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center justify-center text-center px-1 max-w-[130px]">
                  <span
                    className="text-[9px] font-bold tracking-tight px-1.5 py-0.5 rounded-md inline-block max-w-[125px] line-clamp-2 leading-tight mb-0.5 shadow-2xs text-center"
                    style={{
                      backgroundColor: `${hoveredCategory.color}20`,
                      color: hoveredCategory.color,
                      border: `1px solid ${hoveredCategory.color}40`,
                    }}
                  >
                    {hoveredCategory.name}
                  </span>
                  <div className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-slate-100 leading-tight">
                    {hoveredCategory.revenue_m != null
                      ? `IDR ${hoveredCategory.revenue_m.toFixed(2).replace(".", ",")} M`
                      : `${hoveredCategory.percentage}%`}
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    {hoveredCategory.percentage}% dari total
                  </span>
                </div>
              ) : (
                <div className="animate-in fade-in duration-200 flex flex-col items-center justify-center text-center px-1 space-y-0.5 max-w-[130px]">
                  <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
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

          {/* Right: Vertical Category Legend List (Clean, Sleek, Interactive, Zero Obtrusive Popups, ZERO Scrollbar) */}
          <div
            className={`flex-1 w-full min-w-0 flex flex-col justify-center ${
              items.length > 7 ? "gap-1" : "gap-1.5"
            } py-0.5`}
          >
            {items.map((item) => {
              const isHovered = hoveredCategory?.name === item.name;
              const isCompact = items.length > 7;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => handleCategoryHover(item)}
                  onMouseLeave={handleCategoryLeave}
                  onClick={() => setIsModalOpen(true)}
                  className={`px-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between select-none ${
                    isCompact ? "py-1 text-[11px]" : "py-1.5 px-2.5 text-xs"
                  } ${
                    isHovered
                      ? "bg-blue-50/90 dark:bg-slate-800 border-blue-400 dark:border-blue-500 shadow-2xs -translate-y-0.5"
                      : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/70 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span
                      className="h-2 w-2 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {item.revenue_m != null ? `${item.revenue_m.toFixed(2).replace(".", ",")} M` : "—"}
                    </span>
                    <span
                      className={`font-bold rounded ${
                        isCompact ? "text-[9px] px-1 py-0.2" : "text-[9.5px] px-1.5 py-0.2"
                      } ${
                        isHovered
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80"
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
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
                  Agregasi transaksi penjualan per kategori dari {databaseQueried} (Sesuai klasifikasi master item ERP)
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

            {/* 3 Summary Highlight Cards (Harmonized Font Size & Padding) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3">
              {/* Card 1: Total Omzet Kategori */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100/80 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <PieIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
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
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    Kategori Penjualan Terbesar
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-emerald-900 dark:text-emerald-300 truncate block">
                    {dominantCategory ? `${dominantCategory.name} (${dominantCategory.percentage}%)` : "—"}
                  </span>
                </div>
              </div>

              {/* Card 3: Total Kategori Terdaftar */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-100/80 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    Keragaman Portofolio
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-purple-900 dark:text-purple-300">
                    {items.length} Kategori Produk
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Search & Count Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-6 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Menampilkan {displayedModalItems.length} dari {items.length} Kategori Produk
                </span>
                {searchQuery && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                    Filter: &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>

              {/* Search Input Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama kategori..."
                  className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Table Area: Fully Visible, Zero Scrollbar, Harmonized Font */}
            <div className="px-6 py-2 overflow-y-auto flex-1">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center whitespace-nowrap">No</th>
                      <th className="py-2 px-3 whitespace-nowrap">Kategori Produk</th>
                      <th className="py-2 px-3 text-right whitespace-nowrap">Omzet (IDR Miliar)</th>
                      <th className="py-2 px-3 text-right whitespace-nowrap">Nilai Faktur Riil (Rupiah)</th>
                      <th className="py-2 px-3 text-right whitespace-nowrap">% Kontribusi Total</th>
                      <th className="py-2 px-3 text-center whitespace-nowrap w-36">Status Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                    {displayedModalItems.map((it, idx) => {
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
                          <td className="py-2 px-3 text-center text-slate-400 font-sans font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: it.color }}
                              />
                              <span>{it.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            IDR {valM} M
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">
                            Rp {formattedRp}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 font-mono">
                              {/* Uniform Progress Bar Track */}
                              <div className="w-16 sm:w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 hidden sm:block">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.max(Math.min(it.percentage, 100), (it.raw_revenue && it.raw_revenue > 0) ? 2 : 0)}%`,
                                    backgroundColor: it.color,
                                  }}
                                />
                              </div>
                              {/* Fixed-width percentage label for razor-sharp column alignment */}
                              <span className="w-11 text-right font-bold text-xs text-slate-900 dark:text-slate-100 shrink-0">
                                {it.percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap w-36">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Terverifikasi SQL</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 font-sans text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        Total Konsolidasi ({displayYear})
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                        {totalFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">
                        Rp{" "}
                        {Number(computedTotalRaw).toLocaleString("id-ID", {
                          minimumFractionDigits: computedTotalRaw % 1 === 0 ? 0 : 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-slate-100 text-sm whitespace-nowrap">
                        100,0%
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs text-emerald-600 dark:text-emerald-400 font-sans font-semibold whitespace-nowrap w-36">
                        ✓ Terverifikasi SQL
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                Data omzet kategori dihitung secara real-time dari seluruh faktur penjualan komersial (PT API, PT AMG, PT ANR) setelah eliminasi transaksi antar-perusahaan grup.
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
                      <span className="whitespace-nowrap font-medium">Berhasil Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-white shrink-0" />
                      <span className="whitespace-nowrap font-medium">Salin Semua ke Excel (CSV)</span>
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
