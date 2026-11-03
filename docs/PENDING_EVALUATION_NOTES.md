# 📌 Catatan Evaluasi: Penanganan Transaksi Afiliasi & Segmentasi Penjualan (Telah Selesai Diimplementasikan)

**Status:** ✅ Selesai Diimplementasikan (Berdasarkan Data Validasi Resmi 2 Nov 2026)  
**Tanggal Penyelesaian:** 2 November 2026  
**Modul:** `backend/app/services/live_sales_service.py`, `backend/app/api/v1/endpoints/overview.py`, Query T-SQL Multi-Entitas, `frontend/src/components/overview/OverviewHeader.tsx`, `MonthlyRevenueChart.tsx`

---

## 1. Hasil Crosscheck Data Resmi (`crosscheck data - Data Keuangan PT - Per Tahun.csv`)
Dari file CSV referensi resmi, angka terbukti 100% konsisten antara Standalone Gross dan pecahan per ELIMINASI:

### PT Agrochem Mega Globalindo (AMG):
| Tahun | Standalone Gross (Total PT) | Pihak Ketiga (Murni OTH) | Afiliasi (Intercompany) | Breakdown Afiliasi | Status Reconciled |
|---|---|---|---|---|---|
| **2024** | **Rp 187.202.479.214** | Rp 186.966.591.714 | Rp 235.887.500 | API (Rp 162,62 Jt) + SBP (Rp 73,26 Jt) | **Klop 100%** |
| **2025** | **Rp 255.670.314.068** | Rp 255.631.449.068 | Rp 38.865.000 | API (Rp 38,86 Jt) | **Klop 100%** |
| **2026** | **Rp 244.818.802.226** | Rp 244.746.661.476 | Rp 72.140.750 | API (Rp 72,14 Jt) | **Klop 100%** |

*Catatan:* OTH + Afiliasi = Gross Standalone hingga satuan rupiah terkecil.

---

## 2. Solusi Best Practice yang Telah Diimplementasikan (Opsi 1)

1. **Perubahan Terminologi Eksekutif:**
   - Mengganti teks teknis `"Semua Entitas (Konsolidasi Multi-DB)"` $\rightarrow$ **`Konsolidasi Grup (Holding)`**.
   - Menghilangkan singkatan internal non-standar seperti LK atau Opsi C menjadi **Data Keuangan (Resmi/Audited)** dan **Penyesuaian Tutup Buku (31 Des)**.

2. **Dedicated Segment Filter di Overview Header:**
   - Dropdown interaktif baru di sebelah entitas:
     * `Semua Penjualan (Gross)` (Default: Menampilkan total pendapatan kotor PT AMG / Grup).
     * `Pihak Ketiga Saja (Murni OTH)` (Non-afiliasi eksternal murni).
     * `Afiliasi Antar-Grup` (Transaksi intercompany antar 7 entitas grup).

3. **Pemetaan Pintar 7 Entitas Afiliasi (Tanpa Mengubah Database SQL Lokal User):**
   - Backend memetakan otomatis 7 entitas resmi grup melalui `settings.AFFILIATED_COMPANIES`:
     1. PT Agrofarm Nusa Raya (ANR)
     2. PT Agrochem Mega Globalindo (AMG)
     3. PT Agri Prime International (API)
     4. PT Mycotech Agro Asia (MAA)
     5. PT Sarana Agro Panata (SAP)
     6. PT Sarana Benih Panata (SBP)
     7. PT Talenta Tiga Muda (TTM)
   - Seluruh file SQL repository di `backend/sql/amg/` telah diperbarui dengan klausa `CASE WHEN` 7 entitas lengkap.

4. **Perbaikan Tampilan Modal Rincian Data:**
   - Pelebaran kontainer modal menjadi `max-w-6xl` (1152px) dengan `overflow-x-auto`.
   - Kolom status audit diperlebar (`min-w-[210px] w-52`) dan menggunakan `whitespace-nowrap` sehingga badge `"Penyesuaian Tutup Buku (31 Des)"` rapi, proporsional, dan tidak lagi terpotong.
