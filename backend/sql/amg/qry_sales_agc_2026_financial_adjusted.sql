-- ====================================================================
-- Script Name: qry_sales_agc_2026_financial_adjusted.sql
-- Description: Query Konsolidasi Penjualan AMG 2026 (Database AGCdb003)
-- ====================================================================

WITH RawCombinedData AS (
    SELECT
        'AMG'                                       AS [PT],
        2026                                        AS TahunDb,
        
        LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice, 

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
    FROM [AGCdb003].[dbo].[SalesInvoiceItems] sii
    INNER JOIN [AGCdb003].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
    LEFT JOIN  [AGCdb003].[dbo].[InventoryStocks] istok   ON sii.InventoryStockId = istok.InventoryStockId
    LEFT JOIN  [AGCdb003].[dbo].[Inventories] inv         ON istok.InventoryId = inv.InventoryId
    LEFT JOIN  [AGCdb003].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
    LEFT JOIN  [AGCdb003].[dbo].[Customers] c             ON sih.CustomerId = c.CustomerId
    LEFT JOIN  [AGCdb003].[dbo].[CustomerGroups] cg       ON c.CustomerGroupId = cg.CustomerGroupId
    LEFT JOIN  [AGCdb003].[dbo].[Salesmen] sm             ON sih.KodeSales = sm.KodeSales
    WHERE sih.TglFaktur >= '2026-01-01' AND sih.TglFaktur < '2026-09-26'
      -- EKSKLUSI 6 NOTA ERP-ONLY YANG TIDAK ADA DI LAPORAN KEUANGAN
      AND LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) NOT IN (
          '421.1/INV/AMG-ANR/VIII/26',
          '421.2/INV/AMG-ANR/VIII/26',
          '436/INV/AMG-BLS/IX/26(PPN KELUARAN)',
          '376/INV/AMG-MAR/VIII/26(1)',
          '387/INV/AMG-ASL/VIII/26 (1)',
          '236/INV/AMG-GH/V/26(1)'
      )
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
        
        -- KOREKSI QTY UNTUK RETUR RS-...
        CASE WHEN r.NoInvoice LIKE 'RS-%' THEN -ABS(r.Qty) ELSE r.Qty END AS [Qty],
        r.UM                                                    AS [U/M],
        
        CAST(r.HargaJualNet AS DECIMAL(18,5))                   AS [Harga Jual Net],
        CAST(r.HPP AS DECIMAL(18,2))                            AS [HPP],
        CAST(r.HPP AS DECIMAL(18,2))                            AS [Perubahan HPP],
        CAST(r.HPP AS DECIMAL(18,2))                            AS [HPP Konsol],
        CAST(r.HargaJualNet - r.HPP AS DECIMAL(18,2))           AS [Laba / Rugi],
        CAST(r.HargaJualNet - r.HPP AS DECIMAL(18,2))           AS [Laba / Rugi Konsol],
        CAST(r.Qty * r.HPP AS DECIMAL(18,2))                    AS [Jumlah HPP],
        CAST(r.Qty * (r.HargaJualNet - r.HPP) AS DECIMAL(18,2)) AS [Jumlah (Gross Profit)],
        
        -- KOREKSI NILAI PENJUALAN MURNI ERP
        CAST(
            CASE 
                WHEN r.NoInvoice = '291/INV/AMG-NKL/VI/26' THEN 18300000        
                WHEN r.NoInvoice LIKE 'RS-%'              THEN -ABS(r.Qty * r.HargaJualNet)
                ELSE r.Qty * r.HargaJualNet 
            END AS DECIMAL(18,2))                               AS [Penjualan],
            
        CAST(
            CASE 
                WHEN r.NoInvoice LIKE 'RS-%'              THEN -ABS(r.Qty * r.HPP)
                WHEN r.NoInvoice = '291/INV/AMG-NKL/VI/26' THEN 8000000          
                ELSE r.Qty * r.HPP 
            END AS DECIMAL(18,2))                               AS [Nilai HPP],
            
        CAST(r.Qty * r.HPP AS DECIMAL(18,2))                    AS [Nilai HPP Konsol],
        
        CASE 
            WHEN r.NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
            WHEN r.NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
            WHEN r.NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
            WHEN r.NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
            WHEN r.NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
            ELSE 'OTH'
        END                                                     AS [ELIMINASI],
        
        r.[PT],
        r.GrupCustomer                                          AS [GROUP],
        r.NamaBarang                                            AS [Nama Barang Standard],
        r.TransactionItemId                                     AS TransactionItemId
    FROM RankedData r
    WHERE r.rn = 1
),

-- SUNTIKAN RETUR/KOREKSI PARSIAL FINANCE MENGGUNAKAN UNION ALL
tambah AS (
    SELECT 
        MONTH(CAST(v.tgl AS DATE))                  AS [Periode], 
        2026                                        AS [Tahun], 
        v.inv                                       AS [No Invoice], 
        CAST(v.tgl AS DATE)                         AS [Tgl Trn],
        CAST('Penyesuaian Retur / Koreksi' AS VARCHAR(200)) AS [Nama Customer], 
        CAST('UMUM' AS VARCHAR(100))                AS [Produk],
        CAST('Tidak Ada Salesman' AS VARCHAR(100))  AS [Nama Sales],
        CAST('-' AS VARCHAR(50))                    AS [Kode Barang], 
        CAST('Koreksi Retur / Potongan Finance' AS VARCHAR(200)) AS [Nama Barang],
        v.qty                                       AS [Qty], 
        CAST('Pcs' AS VARCHAR(10))                  AS [U/M],
        CAST(0 AS DECIMAL(18,5))                    AS [Harga Jual Net],
        CAST(0 AS DECIMAL(18,2))                    AS [HPP],
        CAST(0 AS DECIMAL(18,2))                    AS [Perubahan HPP],
        CAST(0 AS DECIMAL(18,2))                    AS [HPP Konsol],
        CAST(0 AS DECIMAL(18,2))                    AS [Laba / Rugi],
        CAST(0 AS DECIMAL(18,2))                    AS [Laba / Rugi Konsol],
        CAST(0 AS DECIMAL(18,2))                    AS [Jumlah HPP],
        CAST(0 AS DECIMAL(18,2))                    AS [Jumlah (Gross Profit)],
        CAST(v.nilai AS DECIMAL(18,2))              AS [Penjualan], 
        CAST(0 AS DECIMAL(18,2))                    AS [Nilai HPP],
        CAST(0 AS DECIMAL(18,2))                    AS [Nilai HPP Konsol],
        CAST('OTH' AS VARCHAR(50))                  AS [ELIMINASI],
        'AMG'                                       AS [PT],
        CAST('OTH' AS VARCHAR(50))                  AS [GROUP],
        CAST('Koreksi Retur / Potongan Finance' AS VARCHAR(200)) AS [Nama Barang Standard],
        CAST('00000000-0000-0000-0000-000000000000' AS UNIQUEIDENTIFIER) AS TransactionItemId
    FROM (VALUES
        ('063/INV/AMG-RHM/II/26',          '2026-03-02', -10000,   -1038240),
        ('068/INV/AMG-WKS/II/26',          '2026-03-02', -10000,   -1038240),
        ('068/INV/AMG-WKS/II/26',          '2026-04-13',     -1,  -11500000),
        ('075/INV/AMG-PBLP/II/26',         '2026-03-02',    -75,    -193550),
        ('223/INV/AMG-BAM/V/26 REVISI INV','2026-07-27',    -10,    -377000)
    ) v(inv, tgl, qty, nilai)
),

combined_final AS (
    SELECT * FROM Base
    UNION ALL
    SELECT * FROM tambah
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
    
    ROUND([Penjualan], 0)        AS [Penjualan],
    ROUND([Nilai HPP], 0)        AS [Nilai HPP],
    ROUND([Nilai HPP Konsol], 0) AS [Nilai HPP Konsol],
    
    [ELIMINASI],
    [PT],
    [GROUP],
    [Nama Barang Standard]
FROM combined_final
ORDER BY 
    [Tahun] ASC, 
    [Tgl Trn] ASC, 
    [No Invoice] ASC, 
    TransactionItemId ASC;