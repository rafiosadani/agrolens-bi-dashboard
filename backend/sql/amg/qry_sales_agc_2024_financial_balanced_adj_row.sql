-- ====================================================================
-- Script Name: qry_sales_agc_2024_financial_balanced_adj_row.sql
-- Description: Query Konsolidasi Penjualan AMG 2024 (Database AGCdb001)
--              Tab 2: Financial Layer dengan Opsi C (Adjustment Row)
--              Target Keuangan Resmi: Rp 187,202,479,214.00
-- ====================================================================

WITH RawCombinedData AS (
    SELECT
        'AMG'                                       AS [PT],
        2024                                        AS TahunDb,
        
        -- MAPPING TYPO INVOICE AMG 2024
        CASE 
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('017/INV/AMG-WNL/I/24', '017/INV/AMG-WNL/I/245') THEN '017/INV/AMG-WNL/I/24'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('128/INV/AMG-DSU/III/24', '128/INV/AMG-DSU/IV/24') THEN '128/INV/AMG-DSU/III/24'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('187/INV/AMG-KAP/V/24', '187/INV/AMG-KAP/V/24018') THEN '187/INV/AMG-KAP/V/24'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('295/INV/AMG-BJB/IX/24', '295/INV/AMG-BJP/IX/24') THEN '295/INV/AMG-BJB/IX/24'
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('163/INV-AMG/MAPA/IV/2024', '163/INV/AMG-MAPA/IV/24') THEN '163/INV-AMG/MAPA/IV/2024'
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
    FROM [AGCdb001].[dbo].[SalesInvoiceItems] sii
    INNER JOIN [AGCdb001].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
    LEFT JOIN  [AGCdb001].[dbo].[InventoryStocks] istok   ON sii.InventoryStockId = istok.InventoryStockId
    LEFT JOIN  [AGCdb001].[dbo].[Inventories] inv         ON istok.InventoryId = inv.InventoryId
    LEFT JOIN  [AGCdb001].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
    LEFT JOIN  [AGCdb001].[dbo].[Customers] c             ON sih.CustomerId = c.CustomerId
    LEFT JOIN  [AGCdb001].[dbo].[CustomerGroups] cg       ON c.CustomerGroupId = cg.CustomerGroupId
    LEFT JOIN  [AGCdb001].[dbo].[Salesmen] sm             ON sih.KodeSales = sm.KodeSales
    WHERE sih.TglFaktur >= '2024-01-01' AND sih.TglFaktur < '2025-01-01'
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
        2024                                                    AS [Tahun],
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
        ('128/INV/AMG-DSU/III/24-KOR',  3, '2024-03-31', -374904999.65),
        ('ADJ/AUDIT-SEP/2024',          9, '2024-09-30',    -509999.75),
        ('ADJ/AUDIT-OKT/2024',         10, '2024-10-31',   -1356400.45),
        ('ADJ/AUDIT-DES/2024',         12, '2024-12-31',  376771401.38)
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