"use client";

import { useState } from "react";
import { OverviewHeader, ReportTab } from "@/components/overview/OverviewHeader";
import { OverviewView } from "@/components/overview/OverviewView";
import { CompetitorUploadModal } from "@/components/overview/CompetitorUploadModal";

export default function Page() {
  const [activeTab, setActiveTab] = useState<ReportTab>("ringkasan");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Jan–Sep 2026");
  const [selectedEntity, setSelectedEntity] = useState<string>("Semua");
  const [databaseQueried, setDatabaseQueried] = useState<string>("APIdb003, AGCdb003, AGFdb003");
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025, 2024]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleDownload = () => {
    window.print();
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-blue-600/10 selection:text-blue-900">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Navigation & Brand Header */}
        <OverviewHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          selectedEntity={selectedEntity}
          onEntityChange={setSelectedEntity}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onDownload={handleDownload}
          databaseQueried={databaseQueried}
          availableYears={availableYears}
          isUpdating={isUpdating}
        />

        {/* Dynamic Tab Content */}
        <main className="transition-all duration-200">
          {activeTab === "ringkasan" ? (
            <OverviewView
              entity={selectedEntity}
              period={selectedPeriod}
              refreshTrigger={refreshTrigger}
              onDatabaseResolved={setDatabaseQueried}
              onYearsResolved={setAvailableYears}
              onUpdatingChange={setIsUpdating}
            />
          ) : (
            /* Placeholder for remaining tabs as we build step-by-step */
            <div className="px-6 sm:px-8 py-12 flex flex-col items-center justify-center text-center">
              <div className="max-w-md bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Modul Mendatang
                </span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
                  Tab {activeTab.replace("_", " ")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kita saat ini sedang fokus menuntaskan dan memvalidasi modul <strong>Ringkasan (Overview)</strong> terlebih dahulu secara bertahap.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("ringkasan")}
                  className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Kembali ke Ringkasan
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Admin Excel Upload Modal */}
      <CompetitorUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
