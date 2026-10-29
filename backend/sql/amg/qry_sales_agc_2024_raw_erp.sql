-- ====================================================================
-- Script Name: qry_sales_agc_2024_raw_erp.sql
-- Description: Query Konsolidasi Penjualan AMG 2024 (Database AGCdb001)
--              Tanpa Pro-Rata, Murni ERP + Penyesuaian Exception Bersih
-- ====================================================================

WITH RawCombinedData AS (
    SELECT
        'AMG'                                       AS [PT],
        2024                                        AS TahunDb,
        
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
            WHEN r.NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
            ELSE 'OTH'
        END                                                     AS [ELIMINASI],
        
        r.[PT],
        r.GrupCustomer                                          AS [GROUP],
        r.NamaBarang                                            AS [Nama Barang Standard],
        r.TransactionItemId                                     AS TransactionItemId
    FROM RankedData r
    WHERE r.rn = 1
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
FROM Base
ORDER BY [Tahun] ASC, [Tgl Trn] ASC, [No Invoice] ASC, TransactionItemId ASC;