"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Download, Upload, Filter, Building2, RotateCcw, Loader2, Check } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export type ReportTab =
  | "overview"
  | "revenue"
  | "profitability"
  | "financial-health"
  | "cost"
  | "customers-ar"
  | "operations";

interface OverviewHeaderProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  selectedEntity: string;
  onEntityChange: (entity: string) => void;
  onResetFilters?: () => void;
  onOpenUploadModal: () => void;
  onDownload: () => void;
  databaseQueried?: string;
  availableYears?: number[];
  isUpdating?: boolean;
}

const TABS: { id: ReportTab; label: string }[] = [
  { id: "overview", label: "Ringkasan" },
  { id: "revenue", label: "Revenue" },
  { id: "profitability", label: "Profitabilitas" },
  { id: "financial-health", label: "Kesehatan Keuangan" },
  { id: "cost", label: "Biaya" },
  { id: "customers-ar", label: "Customer & Piutang" },
  { id: "operations", label: "Operasional" },
];

export function OverviewHeader({
  activeTab,
  onTabChange,
  selectedPeriod,
  onPeriodChange,
  selectedEntity,
  onEntityChange,
  onResetFilters,
  onOpenUploadModal,
  onDownload,
  databaseQueried = "APIdb003, AGCdb003, AGFdb003",
  availableYears = [2026, 2025, 2024],
  isUpdating = false,
}: OverviewHeaderProps) {
  // Check if "Semua Tahun" is active
  const isAllYears = useMemo(() => {
    return selectedPeriod.includes("Semua Tahun") || selectedPeriod.includes("All Years");
  }, [selectedPeriod]);

  // Derive current year (e.g. 2026, 2025, 2024)
  const activeYear = useMemo(() => {
    const match = selectedPeriod.match(/\b(202\d)\b/);
    return match ? match[1] : "2026";
  }, [selectedPeriod]);

  // Derive current horizon / range
  const activeHorizon = useMemo(() => {
    if (selectedPeriod.includes("Q1")) return "Q1";
    if (selectedPeriod.includes("Q2")) return "Q2";
    if (selectedPeriod.includes("Q3")) return "Q3";
    if (selectedPeriod.includes("Q4")) return "Q4";
    if (selectedPeriod.includes("Jan–Des")) return "ALL";
    return "YTD";
  }, [selectedPeriod]);

  const buildPeriodString = (year: string, horizon: string) => {
    if (horizon === "ALL") return year === "2026" ? `Jan–Sep ${year}` : `Jan–Des ${year}`;
    if (horizon === "YTD") return `Jan–Sep ${year}`;
    if (horizon === "Q1") return `Q1 (Jan–Mar) ${year}`;
    if (horizon === "Q2") return `Q2 (Apr–Jun) ${year}`;
    if (horizon === "Q3") return `Q3 (Jul–Sep) ${year}`;
    if (horizon === "Q4") return year === "2026" ? `Jan–Sep ${year}` : `Q4 (Okt–Des) ${year}`;
    return year === "2026" ? `Jan–Sep ${year}` : `Jan–Des ${year}`;
  };

  const handleYearChange = (newYear: string) => {
    let nextHorizon = activeHorizon;
    if (newYear === "2026") {
      // 2026 adalah tahun berjalan: Q4 belum ada transaksi, default ke YTD (Jan–Sep)
      if (activeHorizon === "Q4" || activeHorizon === "ALL") {
        nextHorizon = "YTD";
      }
    } else {
      // Tahun tutup buku (2025, 2024): default selalu full year (Semua 12 Bln)
      // kecuali user sengaja sedang memilih kuartal spesifik (Q1, Q2, Q3)
      if (activeHorizon === "YTD" || activeHorizon === "ALL") {
        nextHorizon = "ALL";
      }
    }
    onPeriodChange(buildPeriodString(newYear, nextHorizon));
  };

  const handleHorizonChange = (newHorizon: string) => {
    if (isAllYears) {
      if (newHorizon === "ALL") onPeriodChange("Semua Tahun");
      else onPeriodChange(`${newHorizon} Semua Tahun`);
    } else {
      onPeriodChange(buildPeriodString(activeYear, newHorizon));
    }
  };

  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      onPeriodChange("Jan–Sep 2026");
      onEntityChange("Semua");
    }
  };

  return (
    <header className="space-y-3.5 pt-5 pb-1 px-6 sm:px-8 bg-transparent">
      {/* Row 1: Brand Header & Global Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="relative h-10 w-36 shrink-0 flex items-center justify-start">
            <Image
              src="/sidebar-maxi.png"
              alt="Logo PT Agrofarm"
              width={140}
              height={36}
              priority
              className="object-contain"
            />
          </div>

          <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Business Analysis Report
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ringkasan · {selectedPeriod} · {selectedEntity === "Semua" ? "Konsolidasi" : selectedEntity}
              </p>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live SQL Server (1435)
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Admin Upload / Import Button */}
          <button
            type="button"
            onClick={onOpenUploadModal}
            title="Import Excel Analisis Kompetitor ke Staging"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Import Benchmark</span>
          </button>

          {/* Light/Dark Mode Toggle */}
          <ThemeToggle />

          {/* Download Button */}
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#111827] text-white hover:bg-[#1F2937] active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Row 2: Navigation Pill Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer shrink-0 select-none ${
                isActive
                  ? "bg-[#182235] text-white shadow-xs"
                  : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Row 3: Dedicated Global Filter Strip (2-Tier Clean Enterprise Layout) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs transition-colors space-y-2.5">
        {/* Tier 1: Primary Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Label with Filter Icon */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 pr-1 select-none">
            <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Filter Global:</span>
          </div>

          {/* 1. Dynamic Year Segmented Pills (2026, 2025, 2024, ...) */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 shadow-3xs">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => handleYearChange(String(year))}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeYear === String(year)
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-700/70 active:scale-95"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* 2. Rentang Waktu / Kuartal Pills */}
          <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 shadow-3xs">
            {[
              { id: "ALL", label: activeYear === "2026" ? "Semua (9 Bln)" : "Semua (12 Bln)" },
              { id: "YTD", label: "YTD (Jan–Sep)" },
              { id: "Q1", label: "Q1" },
              { id: "Q2", label: "Q2" },
              { id: "Q3", label: "Q3" },
              { id: "Q4", label: "Q4" },
            ].map((horizon) => {
              const isQ4Disabled = activeYear === "2026" && horizon.id === "Q4";

              if (isQ4Disabled) {
                return (
                  <button
                    key={horizon.id}
                    type="button"
                    disabled
                    title="Data Q4 2026 belum tersedia (Cut-off transaksi September 2026)"
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-md opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-500 line-through select-none"
                  >
                    {horizon.label}
                  </button>
                );
              }

              return (
                <button
                  key={horizon.id}
                  type="button"
                  onClick={() => handleHorizonChange(horizon.id)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeHorizon === horizon.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-700/70 active:scale-95"
                  }`}
                >
                  {horizon.label}
                </button>
              );
            })}
          </div>

          {/* 3. Scope Entitas Perusahaan Dropdown (Nama Lengkap Resmi Tanpa Singkatan) */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-3xs">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Filter Entitas Perusahaan"
              value={selectedEntity}
              onChange={(e) => onEntityChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="Semua">Semua Entitas (Konsolidasi Multi-DB)</option>
              <option value="API">PT Agri Prime International (API)</option>
              <option value="AMG">PT Agrochem Mega Globalindo (AMG)</option>
              <option value="ANR">PT Agrofarm Nusa Raya (ANR)</option>
            </select>
          </div>
        </div>

        {/* Tier 2: Dedicated Status & Action Strip (Stabil, Bebas Lonjakan) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          {/* Left: Active Live Database Indicator / Updating Spinner */}
          <div className="flex items-center gap-2">
            {isUpdating ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-blue-700 dark:text-blue-300 animate-in fade-in duration-150">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Memperbarui live SQL Server...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live SQL Server: {databaseQueried || "APIdb, AGCdb, AGFdb"}</span>
              </div>
            )}
          </div>

          {/* Right: Reset Action */}
          <button
            type="button"
            onClick={handleResetFilters}
            title="Reset ke Filter Default (Jan–Sep 2026 Konsolidasi)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>
    </header>
  );
}
