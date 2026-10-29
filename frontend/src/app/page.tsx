"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { OverviewHeader, ReportTab } from "@/components/overview/OverviewHeader";
import { OverviewView } from "@/components/overview/OverviewView";
import { CompetitorUploadModal } from "@/components/overview/CompetitorUploadModal";
import { Loader2 } from "lucide-react";

const VALID_TABS: ReportTab[] = [
  "overview",
  "revenue",
  "profitability",
  "financial-health",
  "cost",
  "customers-ar",
  "operations",
];

const DEFAULT_TAB: ReportTab = "overview";
const DEFAULT_PERIOD = "Jan–Sep 2026";
const DEFAULT_ENTITY = "Semua";

// Aliases to gracefully support legacy or alternate slugs in URLs
const TAB_ALIASES: Record<string, ReportTab> = {
  ringkasan: "overview",
  summary: "overview",
  profitabilitas: "profitability",
  kesehatan_keuangan: "financial-health",
  "financial_health": "financial-health",
  biaya: "cost",
  expenses: "cost",
  customer_piutang: "customers-ar",
  "customers_ar": "customers-ar",
  customers: "customers-ar",
  operasional: "operations",
};

function resolveTab(param: string | null): ReportTab {
  if (!param) return DEFAULT_TAB;
  const lower = param.toLowerCase();
  if (VALID_TABS.includes(lower as ReportTab)) return lower as ReportTab;
  if (TAB_ALIASES[lower]) return TAB_ALIASES[lower];
  return DEFAULT_TAB;
}

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL query parameters (if present)
  const tabParam = searchParams.get("tab");
  const periodParam = searchParams.get("period");
  const entityParam = searchParams.get("entity");

  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    return resolveTab(tabParam);
  });

  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    return periodParam || DEFAULT_PERIOD;
  });

  const [selectedEntity, setSelectedEntity] = useState<string>(() => {
    return entityParam || DEFAULT_ENTITY;
  });

  const [databaseQueried, setDatabaseQueried] = useState<string>("APIdb003, AGCdb003, AGFdb003");
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025, 2024]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Sync state when user navigates using Browser Back/Forward buttons
  useEffect(() => {
    const resolvedTab = resolveTab(searchParams.get("tab"));
    setActiveTab((prev) => (prev !== resolvedTab ? resolvedTab : prev));

    const currentPeriod = searchParams.get("period") || DEFAULT_PERIOD;
    setSelectedPeriod((prev) => (prev !== currentPeriod ? currentPeriod : prev));

    const currentEntity = searchParams.get("entity") || DEFAULT_ENTITY;
    setSelectedEntity((prev) => (prev !== currentEntity ? currentEntity : prev));
  }, [searchParams]);

  // Synchronize URL query parameters with active state (shallow, no page reload)
  const updateUrl = useCallback(
    (newTab: ReportTab, newPeriod: string, newEntity: string) => {
      const params = new URLSearchParams();

      if (newTab !== DEFAULT_TAB) {
        params.set("tab", newTab);
      }
      if (newPeriod !== DEFAULT_PERIOD) {
        params.set("period", newPeriod);
      }
      if (newEntity !== DEFAULT_ENTITY) {
        params.set("entity", newEntity);
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    updateUrl(tab, selectedPeriod, selectedEntity);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    updateUrl(activeTab, period, selectedEntity);
  };

  const handleEntityChange = (entity: string) => {
    setSelectedEntity(entity);
    updateUrl(activeTab, selectedPeriod, entity);
  };

  const handleResetFilters = () => {
    setSelectedPeriod(DEFAULT_PERIOD);
    setSelectedEntity(DEFAULT_ENTITY);
    updateUrl(activeTab, DEFAULT_PERIOD, DEFAULT_ENTITY);
  };

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
          onTabChange={handleTabChange}
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
          selectedEntity={selectedEntity}
          onEntityChange={handleEntityChange}
          onResetFilters={handleResetFilters}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onDownload={handleDownload}
          databaseQueried={databaseQueried}
          availableYears={availableYears}
          isUpdating={isUpdating}
        />

        {/* Dynamic Tab Content */}
        <main className="transition-all duration-200">
          {activeTab === "overview" ? (
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
            <div className="px-6 sm:px-8 py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
              <div className="max-w-md bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Modul Mendatang
                </span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
                  Tab {activeTab.replace("-", " ").replace("_", " ")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kita saat ini sedang fokus menuntaskan dan memvalidasi modul <strong>Ringkasan (Overview)</strong> terlebih dahulu secara bertahap.
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange("overview")}
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

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F172A] flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Memuat AgroLens BI Dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
