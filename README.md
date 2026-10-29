# 🌾 AgroLens: Executive BI & Analytics Hub

**AgroLens** adalah platform analitik bisnis dan Business Intelligence (BI) untuk konsolidasi data eksekutif grup **AgroFarm** (PT Agri Prime Internasional, PT Agrochem Mega Globalindo, dan PT Agrofarm Nusa Raya). Sistem ini mengagregasikan dan menyajikan data operasional serta finansial secara langsung dari database Microsoft SQL Server lokal.

---

## 🏛️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│               Front-End: Next.js (Port 3001)                   │
│   App Router · TypeScript · Tailwind CSS · Lucide · Apache ECharts │
│   - Executive KPI Summary Cards                                 │
│   - Realisasi Penjualan Bulanan & Modal Audit SQL               │
│   - Revenue per Jenis Produk (Donut & Audit Table)              │
│   - Global Dynamic Filter Bar (Entitas & Tahun Dinamis)         │
└────────────────────────────────▲────────────────────────────────┘
                                 │ REST API JSON
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│             Back-End: Python FastAPI (Port 8001)                │
│       FastAPI · pyodbc · In-Memory TTL Cache Engine             │
│   - Multi-database SQL Aggregation Engine                       │
│   - Eliminasi Transaksi Afiliasi Internal Otomatis              │
│   - 120s TTL Caching Layer & Mode Fallback                      │
└────────────────────────────────▲────────────────────────────────┘
                                 │ ODBC Driver 18
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│             Microsoft SQL Server (Port 1435 Dev / 1433 Prod)    │
│   Host: 127.0.0.1,1435 | User: sa                               │
│   - APIdb001, APIdb002, APIdb003 (PT Agri Prime Internasional)  │
│   - AGCdb001, AGCdb002, AGCdb003 (PT Agrochem Mega Globalindo) │
│   - AGFdb002, AGFdb003 (PT Agrofarm Nusa Raya)                 │
│   - TTMdb002 (PT Talenta Tiga Muda)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Menjalankan Sekaligus (Rekomendasi)
Cukup jalankan script launcher di root folder:
```bash
./start_dev.sh
```
Script ini akan otomatis menjalankan:
- Backend FastAPI di `http://localhost:8000`
- Frontend Next.js di `http://localhost:3000`

### Opsi 2: Menjalankan Secara Terpisah

#### 1. Backend (FastAPI Analytics Engine)
```bash
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Swagger Interactive Documentation: `http://localhost:8000/api/v1/docs`
- Health Check: `http://localhost:8000/api/v1/health`

#### 2. Frontend (Next.js App Router)
```bash
cd frontend
npm run dev
```
- Buka browser di: `http://localhost:3000`

---

## 📑 Pemetaan Logika Bisnis & 7 File SQL Lapangan

| Modul Analitik | File Referensi SQL | Tabel ERP Terlibat | Indikator Utama |
|---|---|---|---|
| **O2C Funnel API** | `all_data_api.sql` | `APIdb001`, `APIdb002` (`SalesOrders`, `DeliveryPermits`, `SalesInvoices`, `ArTransactions`) | PO ➔ SJ ➔ Faktur ➔ Kas In |
| **O2C Funnel AMG** | `all_data_amg.sql` | `AGCdb001`, `AGCdb002` | Konversi omzet & pelunasan kas AMG |
| **O2C Funnel ANR** | `all_data_anr.sql` | `AGFdb002`, `AGFdb003` | Konversi omzet & pelunasan kas ANR |
| **Audit Risiko Logistik** | `tabel_pengiriman_outstanding.sql` | `DeliveryPermitItems` LEFT JOIN `SalesInvoiceItems` ON `SalesInvoiceItemId IS NULL` | Barang keluar gudang tapi belum difakturkan |
| **Kategori & Jenis** | `query produk jenis.sql` | `Inventories` (`KodeKategory`) | Herbisida, Insektisida, Fungisida, Pupuk, Benih |
| **Segmentasi Afiliasi** | `all_data_*.sql` & `customer_salah satu pt.sql` | `Customers`, `CustomerGroups` | Pemisahan omzet Afiliasi (11 entitas) vs Pasar Bebas |

---

## 🌿 Struktur Repository

```
agrolens-bi-dashboard/
├── backend/                       # Python FastAPI Analytics Engine
│   ├── app/
│   │   ├── api/v1/                # Endpoint routers (funnel, risk, health, filters)
│   │   ├── core/                  # config.py, database.py, cache.py
│   │   ├── models/                # Pydantic data schemas
│   │   ├── services/              # SQL Aggregation & O2C calculation services
│   │   └── main.py                # FastAPI app initialization
│   ├── .env                       # Database & API configuration
│   └── requirements.txt
├── frontend/                      # Next.js App Router UI
│   ├── src/
│   │   ├── app/                   # App Router pages (/funnel, /risk, /affiliation, /nodes)
│   │   ├── components/            # KPI cards, Funnel pipeline, Risk alerts, Topbar, Sidebar
│   │   └── lib/                   # API client, types, formatting utilities
│   └── package.json
├── docs/sql_references/           # 7 referensi query SQL lapangan riil
├── start_dev.sh                   # Orchestrator runner script
└── README.md
```
