-- ====================================================================
-- Script Name: qry_sales_agc_2025_financial_balanced_adj_row.sql
-- Description: Query Konsolidasi Penjualan AMG 2025 (Database AGCdb002)
--              Tab 2: Financial Layer dengan Opsi C (Adjustment Row)
--              Target Keuangan Resmi: Rp 255,670,314,068.00
-- ====================================================================

WITH RawCombinedData AS (
    SELECT
        'AMG'                                       AS [PT],
        2025                                        AS TahunDb,
        
        -- MAPPING TYPO INVOICE AMG 2025
        CASE 
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('134/INV/AMG-AKO/III/25', '134/INV/AMG-GAB/III/25') THEN '134/INV/AMG-GAB/III/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('234/INV/AMG-SDK/IV/25.', '234/INV/AMG-SDK/IV/25') THEN '234/INV/AMG-SDK/IV/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('350/INV/AMG-MSAL/VII/25', '350/INV/AMG-MSAL/VII/25 (2)') THEN '350/INV/AMG-MSAL/VII/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('015/INV/AMG-PMC/I/25', '015/INV-PMC/I/25') THEN '015/INV/AMG-PMC/I/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('367/INV/AMG-RHM/VII/25', '367/INV/AMG-RHM/VII/55') THEN '367/INV/AMG-RHM/VII/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('120/INV/AMG-GKS/II/25', '121/INV/AMG-GKS/II/25') THEN '120/INV/AMG-GKS/II/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('349/INV/AMG-MAPA/VII/25', '349/INV/AMG-MAPA/VII/25 (2)') THEN '349/INV/AMG-MAPA/VII/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('351/INV/AMG-MSAL/VII/25', '351/INV/AMG-MSAL/VII/25 (2)') THEN '351/INV/AMG-MSAL/VII/25'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) = '515//INV/AMG-KIU/XI/25' THEN '515/INV/AMG-KIU/XI/25'
            ELSE LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', '')))
        END                                         AS NoInvoice, 

        CAST(sih.TglFaktur AS DATE)                 AS TglTrn,
        ISNULL(c.NamaLgn, 'Lain-Lain')              AS NamaCustomer,
        ISNULL(cat.NamaKategory, 'UMUM')            AS Produk,
        ISNULL(inv.KodeItem, sii.Barcode)           AS KodeBarang,  
        ISNULL(sii.NamaBarang, inv.NamaBarang)      AS NamaBarang,
        sii.Qty                                     AS Qty,
        ISNULL(sii.SatuanNs, inv.KodeSatuan)        AS UM,
        
        COALESCE(NULLIF(sii.HargaNet, 0), 
            (((sii.HargaJual * (1.0 - ISNULL(sii.ItemDisPsn, 0)/100.0)) - ISNULL(sii.ItemDisc, 0)) 
             * (1.0 - ISNULL(sii.ItemDisPsn2, 0)/100.0) - ISNULL(sii.ItemDisc2, 0)) 
            * (1.0 - ISNULL(sii.ItemDisPsn3, 0)/100.0) - ISNULL(sii.ItemDisc3, 0)
        )                                           AS BaseHargaNet,
        
        CASE 
            WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I' THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0
            ELSE 1.0
        END                                         AS PpnDivider,

        ISNULL(sih.ExtDisc, 0)                      AS HeaderExtDisc,
        sii.HargaPokok                              AS HPP,
        ISNULL(sm.NamaSales, 'Tidak Ada Salesman')  AS NamaSales,
        ISNULL(cg.CustomerGroupCode, c.NamaLgn)     AS GrupCustomer,
        sii.SalesInvoiceItemId                      AS TransactionItemId
    FROM [AGCdb002].[dbo].[SalesInvoiceItems] sii
    INNER JOIN [AGCdb002].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
    LEFT JOIN  [AGCdb002].[dbo].[InventoryStocks] istok   ON sii.InventoryStockId = istok.InventoryStockId
    LEFT JOIN  [AGCdb002].[dbo].[Inventories] inv         ON istok.InventoryId = inv.InventoryId
    LEFT JOIN  [AGCdb002].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
    LEFT JOIN  [AGCdb002].[dbo].[Customers] c             ON sih.CustomerId = c.CustomerId
    LEFT JOIN  [AGCdb002].[dbo].[CustomerGroups] cg       ON c.CustomerGroupId = cg.CustomerGroupId
    LEFT JOIN  [AGCdb002].[dbo].[Salesmen] sm             ON sih.KodeSales = sm.KodeSales
    WHERE sih.TglFaktur >= '2025-01-01' AND sih.TglFaktur < '2026-01-01'
      -- EKSKLUSI NOTA NON-KOMERSIAL KLAIM TRANSPORTASI
      AND LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) NOT IN ('391/INV/AMG-ANR/VIII/25')
),
CalculatedNet AS (
    SELECT 
        *,
        (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal,
        SUM(Qty * BaseHargaNet / PpnDivider) OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal
    FROM RawCombinedData
),
FinalNetPrice AS (
    SELECT 
        *,
        CASE 
            WHEN InvoiceTotalSubtotal > 0 THEN 
                (BaseHargaNet / PpnDivider) - (((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal) * HeaderExtDisc / NULLIF(Qty, 0))
            ELSE 
                (BaseHargaNet / PpnDivider)
        END AS HargaJualNet
    FROM CalculatedNet
),
RankedData AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY TahunDb, TransactionItemId, NoInvoice
            ORDER BY CASE WHEN YEAR(TglTrn) = TahunDb THEN 0 ELSE 1 END, TahunDb DESC
        ) AS rn
    FROM FinalNetPrice
),
Base AS (
    SELECT
        MONTH(r.TglTrn)                                         AS [Periode],
        YEAR(r.TglTrn)                                          AS [Tahun],
        r.NoInvoice                                             AS [No Invoice],
        r.TglTrn                                                AS [Tgl Trn],
        r.NamaCustomer                                          AS [Nama Customer],
        r.Produk                                                AS [Produk],
        r.NamaSales                                             AS [Nama Sales],
        r.KodeBarang                                            AS [Kode Barang],
        r.NamaBarang                                            AS [Nama Barang],
        r.Qty                                                   AS [Qty],
        r.UM                                                    AS [U/M],
        
        CAST(r.HargaJualNet AS DECIMAL(18,5))                   AS [Harga Jual Net],
        CAST(r.HPP AS DECIMAL(18,2))                            AS [HPP],
        CAST(r.HPP AS DECIMAL(18,2))                            AS [Perubahan HPP],
        CAST(r.HPP AS DECIMAL(18,2))                            AS [HPP Konsol],
        CAST(r.HargaJualNet - r.HPP AS DECIMAL(18,2))           AS [Laba / Rugi],
        CAST(r.HargaJualNet - r.HPP AS DECIMAL(18,2))           AS [Laba / Rugi Konsol],
        CAST(r.Qty * r.HPP AS DECIMAL(18,2))                    AS [Jumlah HPP],
        CAST(r.Qty * (r.HargaJualNet - r.HPP) AS DECIMAL(18,2)) AS [Jumlah (Gross Profit)],
        
        CAST(r.Qty * r.HargaJualNet AS DECIMAL(18,2))           AS [Penjualan],
        CAST(r.Qty * r.HPP AS DECIMAL(18,2))                    AS [Nilai HPP],
        CAST(r.Qty * r.HPP AS DECIMAL(18,2))                    AS [Nilai HPP Konsol],
        
        CASE 
            WHEN r.NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
            WHEN r.NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
            WHEN r.NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
            WHEN r.NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
            WHEN r.NamaCustomer LIKE '%Sarana Agro Panata%' THEN 'SAP'
            WHEN r.NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SBP'
            WHEN r.NamaCustomer LIKE '%Talenta Tiga Muda%' THEN 'TTM'
            ELSE 'OTH'
        END                                                     AS [ELIMINASI],
        
        r.[PT],
        r.GrupCustomer                                          AS [GROUP],
        r.NamaBarang                                            AS [Nama Barang Standard],
        r.TransactionItemId                                     AS TransactionItemId
    FROM RankedData r
    WHERE r.rn = 1
),

-- SUNTIKAN BARIS PENYESUAIAN KEUANGAN KHUSUS (AUDIT ADJUSTMENTS PER BULAN)
AdjustmentRow AS (
    SELECT 
        v.periode                                               AS [Periode],
        2025                                                    AS [Tahun],
        CAST(v.inv AS VARCHAR(100))                             AS [No Invoice],
        CAST(v.tgl AS DATE)                                     AS [Tgl Trn],
        CAST('Penyesuaian Audit Keuangan / Selisih Pembukuan' AS VARCHAR(255)) AS [Nama Customer],
        CAST('UMUM' AS VARCHAR(100))                            AS [Produk],
        CAST('Tidak Ada Salesman' AS VARCHAR(100))              AS [Nama Sales],
        CAST('-' AS VARCHAR(50))                                AS [Kode Barang],
        CAST('Koreksi Selisih Audit & Pembukuan' AS VARCHAR(255)) AS [Nama Barang],
        CAST(0 AS DECIMAL(18,2))                                AS [Qty],
        CAST('Pcs' AS VARCHAR(20))                              AS [U/M],
        CAST(0 AS DECIMAL(18,5))                                AS [Harga Jual Net],
        CAST(0 AS DECIMAL(18,2))                                AS [HPP],
        CAST(0 AS DECIMAL(18,2))                                AS [Perubahan HPP],
        CAST(0 AS DECIMAL(18,2))                                AS [HPP Konsol],
        CAST(0 AS DECIMAL(18,2))                                AS [Laba / Rugi],
        CAST(0 AS DECIMAL(18,2))                                AS [Laba / Rugi Konsol],
        CAST(0 AS DECIMAL(18,2))                                AS [Jumlah HPP],
        CAST(0 AS DECIMAL(18,2))                                AS [Jumlah (Gross Profit)],
        CAST(v.nilai AS DECIMAL(18,2))                          AS [Penjualan],
        CAST(0 AS DECIMAL(18,2))                                AS [Nilai HPP],
        CAST(0 AS DECIMAL(18,2))                                AS [Nilai HPP Konsol],
        CAST('OTH' AS VARCHAR(10))                              AS [ELIMINASI],
        CAST('AMG' AS VARCHAR(10))                              AS [PT],
        CAST('OTH' AS VARCHAR(100))                             AS [GROUP],
        CAST('Koreksi Selisih Audit & Pembukuan' AS VARCHAR(255)) AS [Nama Barang Standard],
        CAST('00000000-0000-0000-0000-000000000000' AS UNIQUEIDENTIFIER) AS TransactionItemId
    FROM (VALUES
        ('ADJ/AUDIT-FEB/2025',  2, '2025-02-28',  -4579762.00),
        ('ADJ/AUDIT-MAR/2025',  3, '2025-03-31',      3621.01),
        ('ADJ/AUDIT-JUN/2025',  6, '2025-06-30',   -367567.18),
        ('ADJ/AUDIT-AGU/2025',  8, '2025-08-31',   1000000.00),
        ('ADJ/AUDIT-OKT/2025', 10, '2025-10-31', -61091000.40),
        ('ADJ/AUDIT-NOV/2025', 11, '2025-11-30',   -981518.95),
        ('ADJ/AUDIT-DES/2025', 12, '2025-12-31', -55043231.73)
    ) v(inv, periode, tgl, nilai)
),

CombinedFinal AS (
    SELECT * FROM Base
    UNION ALL
    SELECT * FROM AdjustmentRow
)

SELECT
    [Periode],
    [Tahun],
    [No Invoice],
    [Tgl Trn],
    [Nama Customer],
    [Produk],
    [Nama Sales],
    [Kode Barang],
    [Nama Barang],
    [Qty],
    [U/M],
    [Harga Jual Net],
    [HPP],
    [Perubahan HPP],
    [HPP Konsol],
    [Laba / Rugi],
    [Laba / Rugi Konsol],
    [Jumlah HPP],
    [Jumlah (Gross Profit)],
    
    ROUND([Penjualan], 0)     AS [Penjualan],
    ROUND([Nilai HPP], 0)     AS [Nilai HPP],
    [Nilai HPP Konsol],
    
    [ELIMINASI],
    [PT],
    [GROUP],
    [Nama Barang Standard]
FROM CombinedFinal
ORDER BY 
    [Tahun] ASC, 
    [Tgl Trn] ASC, 
    [No Invoice] ASC, 
    TransactionItemId ASC;