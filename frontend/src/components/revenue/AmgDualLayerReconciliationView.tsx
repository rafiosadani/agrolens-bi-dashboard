"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Code2,
  X,
  Loader2,
  ShieldCheck,
  Database,
  Building2,
  Calendar,
} from "lucide-react";
import {
  AmgSalesResponse,
  AmgReconciliationResponse,
  fetchAmgSales,
  fetchAmgReconciliation,
  fetchAmgSqlSource,
  AmgSalesItem,
} from "@/lib/amgSalesApi";

type ActiveLayer = "financial" | "raw" | "reconciliation";

interface AmgDualLayerProps {
  initialYear?: number;
}

export function AmgDualLayerReconciliationView({ initialYear = 2025 }: AmgDualLayerProps) {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("financial");
  const [salesData, setSalesData] = useState<AmgSalesResponse | null>(null);
  const [reconciliation, setReconciliation] = useState<AmgReconciliationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [sqlModalOpen, setSqlModalOpen] = useState<boolean>(false);
  const [sqlContent, setSqlContent] = useState<{ filename: string; sql: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  // Load Sales or Reconciliation Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (activeLayer === "reconciliation") {
      fetchAmgReconciliation(selectedYear)
        .then((res) => {
          if (!isMounted) return;
          setReconciliation(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Reconciliation fetch error:", err);
          if (isMounted) setLoading(false);
        });
    } else {
      fetchAmgSales(activeLayer, selectedYear, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: searchQuery || undefined,
      })
        .then((res) => {
          if (!isMounted) return;
          setSalesData(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Sales fetch error:", err);
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [selectedYear, activeLayer, page, pageSize, searchQuery]);

  // Load SQL Source Code
  const handleOpenSql = async () => {
    const layer = activeLayer === "raw" ? "raw" : "financial";
    try {
      const data = await fetchAmgSqlSource(selectedYear, layer);
      setSqlContent(data);
      setSqlModalOpen(true);
    } catch (e) {
      console.error("Failed to load SQL source:", e);
    }
  };

  const handleCopySql = () => {
    if (sqlContent) {
      navigator.clipboard.writeText(sqlContent.sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleCopyCsv = () => {
    if (!salesData || salesData.items.length === 0) return;
    const header = "Periode\tTahun\tNo Invoice\tTgl Trn\tNama Customer\tProduk\tQty\tHarga Net\tHPP\tGross Profit\tPenjualan\tELIMINASI\n";
    const rows = salesData.items
      .map(
        (it) =>
          `${it.Periode}\t${it.Tahun}\t${it["No Invoice"]}\t${it["Tgl Trn"]}\t${it["Nama Customer"]}\t${it.Produk}\t${it.Qty}\t${it["Harga Jual Net"]}\t${it.HPP}\t${it["Jumlah (Gross Profit)"]}\t${it.Penjualan}\t${it.ELIMINASI}`
      )
      .join("\n");
    navigator.clipboard.writeText(header + rows);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const formatIDR = (val?: number) => {
    if (val == null) return "Rp 0";
    return `Rp ${Number(val).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMiliar = (val?: number) => {
    if (val == null) return "IDR 0,00 M";
    return `IDR ${(val / 1e9).toFixed(2).replace(".", ",")} M`;
  };

  return (
    <div className="space-y-4 px-6 sm:px-8 pb-12 animate-in fade-in duration-200">
      {/* Header Banner: Enterprise Dual-Layer Context */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
              AMG
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              PT Agrochem Mega Globalindo (AMG) — Konsolidasi Penjualan Dual-Layer
            </h2>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              Multi-Year Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Arsitektur pemisahan dua layer data: <strong>Data Riil ERP murni</strong> (operasional IT & gudang) dan{" "}
            <strong>Laporan Keuangan Auto-Balanced</strong> (resmi direksi & audit keuangan), serta rekonsiliasi varian selisih.
          </p>
        </div>

        {/* Year Pills & SQL Source Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            {[2026, 2025, 2024].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  setSelectedYear(yr);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedYear === yr
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {yr} {yr === 2026 ? "• Berjalan" : "• Tutup Buku"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleOpenSql}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="Lihat Skrip Query T-SQL Asli"
          >
            <Code2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Skrip T-SQL</span>
          </button>
        </div>
      </div>

      {/* Layer Navigation Tabs (Tab 1, Tab 2, Tab 3) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveLayer("financial");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            activeLayer === "financial"
              ? "bg-[#111827] dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Tab 2: Laporan Keuangan (Auto-Balanced)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
            Resmi Audit
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLayer("raw");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            activeLayer === "raw"
              ? "bg-[#111827] dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Database className="h-4 w-4 text-blue-500" />
          <span>Tab 1: Data Riil ERP (Murni / Raw)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold">
            IT & Gudang
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLayer("reconciliation");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            activeLayer === "reconciliation"
              ? "bg-[#111827] dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <ArrowRightLeft className="h-4 w-4 text-purple-500" />
          <span>Tab 3: Rekonsiliasi & Varian Selisih (LK vs ERP)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold">
            Delta
          </span>
        </button>
      </div>

      {/* Loading Spinner */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Mengeksekusi konsolidasi data SQL Server PT AMG ({selectedYear})...
          </span>
        </div>
      ) : activeLayer === "reconciliation" ? (
        /* =========================================================================
           TAB 3 VIEW: REKONSILIASI & VARIAN (DELTA SELISIH)
           ========================================================================= */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 3 Executive Reconciliation KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Data Riil ERP */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Data Riil ERP (Tab 1)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  AGCdb00{selectedYear === 2024 ? "1" : selectedYear === 2025 ? "2" : "3"}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatMiliar(reconciliation?.raw_erp_total)}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {formatIDR(reconciliation?.raw_erp_total)}
              </p>
            </div>

            {/* Card 2: Laporan Keuangan */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Laporan Keuangan (Tab 2)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Target Resmi Audit
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {formatMiliar(reconciliation?.financial_layer_total)}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {formatIDR(reconciliation?.financial_layer_total)}
              </p>
            </div>

            {/* Card 3: Varian Selisih */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Varian Selisih (LK - ERP)
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    reconciliation?.variance === 0
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  }`}
                >
                  {reconciliation?.match_status || "ADJUSTED"}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-purple-700 dark:text-purple-400">
                {formatMiliar(reconciliation?.variance)}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {formatIDR(reconciliation?.variance)}
              </p>
            </div>
          </div>

          {/* Explanation Notes & Typo Mapping Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Transparansi Rekonsiliasi & Aturan Penyesuaian Akuntansi ({selectedYear})</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {reconciliation?.notes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>

            {selectedYear === 2026 ? (
              <div className="mt-4 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                <span className="font-bold block">Detail Eksklusi & Koreksi Tahun Berjalan 2026:</span>
                <p>
                  • <strong>6 Nota ERP-Only Dieksklusi:</strong> 421.1/INV/AMG-ANR/VIII/26, 421.2/INV/AMG-ANR/VIII/26, 436/INV/AMG-BLS/IX/26(PPN KELUARAN), 376/INV/AMG-MAR/VIII/26(1), 387/INV/AMG-ASL/VIII/26 (1), 236/INV/AMG-GH/V/26(1).
                </p>
                <p>
                  • <strong>5 Koreksi Retur Disuntikkan:</strong> Menggunakan UNION ALL dengan nilai riil penyesuaian finance (total Rp -24,48 Juta).
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                <span className="font-bold block">Status Tutup Buku {selectedYear}:</span>
                <p>
                  Seluruh transaksi telah diaudit dan dikunci (*locked*). Koreksi auto-balancing ditempatkan pada baris transaksi penutup tahun sehingga total penjualan match 100% dengan Laporan Keuangan resmi audit.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
           TAB 1 & TAB 2 VIEW: DATA TRANSAKSI LENGKAP (26 KOLOM)
           ========================================================================= */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                Total Penjualan
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatMiliar(salesData?.summary.total_penjualan)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                Total Nilai HPP
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatMiliar(salesData?.summary.total_hpp)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                Gross Profit (Laba Kotor)
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {formatMiliar(salesData?.summary.total_gross_profit)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                Total Faktur & Transaksi
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-blue-700 dark:text-blue-400">
                {salesData?.summary.total_invoices || 0} Inv / {salesData?.summary.total_rows || 0} Baris
              </span>
            </div>
          </div>

          {/* Table Controls (Search, Copy, Pagination) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari Customer, Invoice, Barang..."
                    className="w-full pl-8 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {copiedCsv ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCsv ? "Tersalin ke Clipboard" : "Salin CSV"}</span>
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">No Invoice</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Tgl Trn</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Nama Customer</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Produk</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Nama Barang</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Qty</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">U/M</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Harga Jual Net</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Nilai Penjualan</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Nilai HPP</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Eliminasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                  {salesData?.items && salesData.items.length > 0 ? (
                    salesData.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {row["No Invoice"]}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-sans">
                          {row["Tgl Trn"]}
                        </td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-xs truncate">
                          {row["Nama Customer"]}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.Produk}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate">
                          {row["Nama Barang"]}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {Number(row.Qty).toLocaleString("id-ID")}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap font-sans">
                          {row["U/M"]}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {Number(row["Harga Jual Net"]).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {Number(row.Penjualan).toLocaleString("id-ID", { minimumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {Number(row["Nilai HPP"]).toLocaleString("id-ID", { minimumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              row.ELIMINASI !== "OTH"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {row.ELIMINASI}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 font-sans">
                        Tidak ada transaksi ditemukan pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Menampilkan halaman {page} (data per halaman: {pageSize})
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <button
                  type="button"
                  disabled={!salesData || salesData.items.length < pageSize}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Script Viewer Modal */}
      {sqlModalOpen && sqlContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {sqlContent.filename}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-950 text-slate-200 font-mono text-xs">
              <pre className="whitespace-pre-wrap">{sqlContent.sql}</pre>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500">
                Skrip ini dieksekusi langsung pada database SQL Server untuk menghasilkan layer data aktif.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedSql ? "Tersalin!" : "Salin Skrip SQL"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSqlModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

