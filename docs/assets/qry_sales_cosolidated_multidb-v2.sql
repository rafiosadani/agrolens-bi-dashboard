-- ====================================================================
-- Script Name: qry_sales_consolidated_fixed.sql
-- Description: Direct Query dengan jalur join langsung ke InventoryStocks
--              untuk memastikan Kode Barang dan Kategori Produk tampil semua.
-- ====================================================================

WITH CombinedData AS (
    /* =========================
       API 2024 (DB 1)
       ========================= */
    SELECT
        'API'                                       AS [PT],
        2024                                        AS TahunDb,
        sih.NoBukti                                 AS NoInvoice,
        CAST(sih.TglFaktur AS DATE)                 AS TglTrn,
        ISNULL(c.NamaLgn, 'Lain-Lain')              AS NamaCustomer,
        
        -- Kategori Produk diambil dari NamaKategory tabel InventoryCategories
        ISNULL(cat.NamaKategory, 'UMUM')            AS Produk,
        
        -- Kode Barang diambil langsung dari Inventories.KodeItem via InventoryStocks
        ISNULL(inv.KodeItem, sii.Barcode)           AS KodeBarang,  
        
        ISNULL(sii.NamaBarang, inv.NamaBarang)      AS NamaBarang,
        sii.Qty                                     AS Qty,
        ISNULL(sii.SatuanNs, inv.KodeSatuan)        AS UM,
        sii.HargaJual                               AS HargaJualNet,
        sii.HargaPokok                              AS HPP,
        ISNULL(sm.NamaSales, 'Tidak Ada Salesman')  AS NamaSales,
        ISNULL(cg.CustomerGroupCode, c.NamaLgn)     AS GrupCustomer,
        sii.SalesInvoiceItemId                      AS TransactionItemId
    FROM [APIdb001].[dbo].[SalesInvoiceItems] sii
    INNER JOIN [APIdb001].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
    LEFT JOIN  [APIdb001].[dbo].[InventoryStocks] istok   ON sii.InventoryStockId = istok.InventoryStockId
    LEFT JOIN  [APIdb001].[dbo].[Inventories] inv         ON istok.InventoryId = inv.InventoryId
    LEFT JOIN  [APIdb001].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
    LEFT JOIN  [APIdb001].[dbo].[Customers] c             ON sih.CustomerId = c.CustomerId
    LEFT JOIN  [APIdb001].[dbo].[CustomerGroups] cg       ON c.CustomerGroupId = cg.CustomerGroupId
    LEFT JOIN  [APIdb001].[dbo].[Salesmen] sm             ON sih.KodeSales = sm.KodeSales

    UNION ALL

    /* =========================
       API 2025 (DB 2)
       ========================= */
    SELECT
        'API', 2025,
        sih.NoBukti,
        CAST(sih.TglFaktur AS DATE),
        ISNULL(c.NamaLgn, 'Lain-Lain'),
        ISNULL(cat.NamaKategory, 'UMUM'),
        ISNULL(inv.KodeItem, sii.Barcode),
        ISNULL(sii.NamaBarang, inv.NamaBarang),
        sii.Qty,
        ISNULL(sii.SatuanNs, inv.KodeSatuan),
        sii.HargaJual,
        sii.HargaPokok,
        ISNULL(sm.NamaSales, 'Tidak Ada Salesman'),
        ISNULL(cg.CustomerGroupCode, c.NamaLgn),
        sii.SalesInvoiceItemId
    FROM [APIdb002].[dbo].[SalesInvoiceItems] sii
    INNER JOIN [APIdb002].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
    LEFT JOIN  [APIdb002].[dbo].[InventoryStocks] istok   ON sii.InventoryStockId = istok.InventoryStockId
    LEFT JOIN  [APIdb002].[dbo].[Inventories] inv         ON istok.InventoryId = inv.InventoryId
    LEFT JOIN  [APIdb002].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
    LEFT JOIN  [APIdb002].[dbo].[Customers] c             ON sih.CustomerId = c.CustomerId
    LEFT JOIN  [APIdb002].[dbo].[CustomerGroups] cg       ON c.CustomerGroupId = cg.CustomerGroupId
    LEFT JOIN  [APIdb002].[dbo].[Salesmen] sm             ON sih.KodeSales = sm.KodeSales

    UNION ALL

    /* =========================
       API 2026 (DB 3)
       ========================= */
    SELECT
        'API', 2026,
        sih.NoBukti,
        CAST(sih.TglFaktur AS DATE),
        ISNULL(c.NamaLgn, 'Lain-Lain'),
        ISNULL(cat.NamaKategory, 'UMUM'),
        ISNULL(inv.KodeItem, sii.Barcode),
        ISNULL(sii.NamaBarang, inv.NamaBarang),
        sii.Qty,
        ISNULL(sii.SatuanNs, inv.KodeSatuan),
        sii.HargaJual,
        sii.HargaPokok,
        ISNULL(sm.NamaSales, 'Tidak Ada Salesman'),
        ISNULL(cg.CustomerGroupCode, c.NamaLgn),
        sii.SalesInvoiceItemId
    FROM [APIdb003].[dbo].[SalesInvoiceItems] sii
    INNER JOIN [APIdb003].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
    LEFT JOIN  [APIdb003].[dbo].[InventoryStocks] istok   ON sii.InventoryStockId = istok.InventoryStockId
    LEFT JOIN  [APIdb003].[dbo].[Inventories] inv         ON istok.InventoryId = inv.InventoryId
    LEFT JOIN  [APIdb003].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
    LEFT JOIN  [APIdb003].[dbo].[Customers] c             ON sih.CustomerId = c.CustomerId
    LEFT JOIN  [APIdb003].[dbo].[CustomerGroups] cg       ON c.CustomerGroupId = cg.CustomerGroupId
    LEFT JOIN  [APIdb003].[dbo].[Salesmen] sm             ON sih.KodeSales = sm.KodeSales
),
RankedData AS (
    SELECT *,
        -- Menggunakan Business Key (NoInvoice, KodeBarang, Qty, TglTrn) untuk deduplikasi yang tepat merentas DB
        ROW_NUMBER() OVER (
            PARTITION BY NoInvoice, KodeBarang, Qty, TglTrn
            ORDER BY CASE WHEN YEAR(TglTrn) = TahunDb THEN 0 ELSE 1 END, TahunDb DESC
        ) AS rn
    FROM CombinedData
), 
Base AS (
    SELECT
        r.*,
        CAST(r.HPP AS DECIMAL(18,2)) AS HPPKonsol
    FROM RankedData r
    WHERE r.rn = 1
)
SELECT
    MONTH(TglTrn)                                   AS [Periode],
    YEAR(TglTrn)                                    AS [Tahun],
    NoInvoice                                       AS [No Invoice],
    TglTrn                                          AS [Tgl Trn],
    NamaCustomer                                    AS [Nama Customer],
    Produk                                          AS [Produk],
    NamaSales                                       AS [Nama Sales],
    KodeBarang                                      AS [Kode Barang],
    NamaBarang                                      AS [Nama Barang],
    Qty                                             AS [Qty],
    UM                                              AS [U/M],
    HargaJualNet                                    AS [Harga Jual Net],
    HPP                                             AS [HPP],
    HPPKonsol                                       AS [Perubahan HPP],
    HPPKonsol                                       AS [HPP Konsol],
    HargaJualNet - HPP                              AS [Laba / Rugi],
    HargaJualNet - HPPKonsol                        AS [Laba / Rugi Konsol],
    Qty * HPP                                       AS [Jumlah HPP],
    Qty * (HargaJualNet - HPP)                      AS [Jumlah (Gross Profit)],
    Qty * HargaJualNet                              AS [Penjualan],
    Qty * HPP                                       AS [Nilai HPP],
    Qty * HPPKonsol                                 AS [Nilai HPP Konsol],
    
    -- Kolom ELIMINASI: Jika afiliasi, tampilkan kode PT-nya, jika bukan isi 'OTH'
    CASE 
        WHEN NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
        WHEN NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
        WHEN NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
        WHEN NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
        WHEN NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
        WHEN NamaCustomer LIKE '%Sarana Agro Panata%' THEN 'SBP'
        WHEN NamaCustomer LIKE '%Talenta Tiga Muda%' THEN 'TTM'
        ELSE 'OTH'
    END                                             AS [ELIMINASI],
    
    [PT],
    GrupCustomer                                    AS [GROUP],
    NamaBarang                                      AS [Nama Barang Standard]
FROM Base
where [NoInvoice] = '093/INV/API-IP/III/26'
ORDER BY TglTrn ASC, NoInvoice ASC;