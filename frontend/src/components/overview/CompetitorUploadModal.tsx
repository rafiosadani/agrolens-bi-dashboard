"use client";

import React, { useState } from "react";
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadCompetitorFile } from "@/lib/overviewApi";

interface CompetitorUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompetitorUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: CompetitorUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setStatusMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const res = await uploadCompetitorFile(selectedFile);
      setStatusMessage({
        type: "success",
        text: res.message || "File berhasil diproses dan disimpan ke staging.",
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan saat upload.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Import Analisis Kompetitor
              </h3>
              <p className="text-[11px] text-slate-500">
                Staging Update · Format Excel (.xlsx) / CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dropzone */}
        <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group bg-slate-50/50 dark:bg-slate-800/30">
          <UploadCloud className="h-8 w-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-2" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {selectedFile ? selectedFile.name : "Pilih atau seret file ke sini"}
          </span>
          <span className="text-[11px] text-slate-400 mt-1">
            Contoh: Industry & Competitor Analysis.xlsx
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handleUpload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#1E3A8A] text-white hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isUploading ? "Memproses..." : "Upload ke Staging"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
