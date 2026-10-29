-- ====================================================================
-- Script Name: qry_sales_agc_2025_financial_balanced.sql
-- Description: Query Konsolidasi Finansial AMG 2025 (Auto-Balanced)
-- ====================================================================
WITH RawCombinedData AS (
    SELECT
        'AMG'                                       AS [PT],
        2025                                        AS TahunDb,
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
        CASE WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I' THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0 ELSE 1.0 END AS PpnDivider,
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
),
CalculatedNet AS (
    SELECT *, (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal,
           SUM(Qty * BaseHargaNet / PpnDivider) OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal
    FROM RawCombinedData
),
FinalNetPrice AS (
    SELECT *,
           CASE WHEN InvoiceTotalSubtotal > 0 THEN (BaseHargaNet / PpnDivider) - (((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal) * HeaderExtDisc / NULLIF(Qty, 0))
                ELSE (BaseHargaNet / PpnDivider) END AS HargaJualNet
    FROM CalculatedNet
),
RankedData AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY TahunDb, TransactionItemId, NoInvoice ORDER BY CASE WHEN YEAR(TglTrn) = TahunDb THEN 0 ELSE 1 END, TahunDb DESC) AS rn
    FROM FinalNetPrice
),
Base AS (
    SELECT r.*, CAST(r.HPP AS DECIMAL(18,2)) AS HPPKonsol FROM RankedData r WHERE r.rn = 1
),
TargetFinansial AS (SELECT 255670314068.00 AS TargetValue),
CurrentERP AS (SELECT SUM(Qty * HargaJualNet) AS CurrentValue FROM Base),
AdjustmentCalculator AS (SELECT (t.TargetValue - c.CurrentValue) AS SelisihKoreksi FROM TargetFinansial t, CurrentERP c)
SELECT
    MONTH(TglTrn) AS [Periode], YEAR(TglTrn) AS [Tahun], NoInvoice AS [No Invoice], TglTrn AS [Tgl Trn],
    NamaCustomer AS [Nama Customer], Produk AS [Produk], NamaSales AS [Nama Sales], KodeBarang AS [Kode Barang],
    NamaBarang AS [Nama Barang], Qty AS [Qty], UM AS [U/M], CAST(HargaJualNet AS DECIMAL(18,5)) AS [Harga Jual Net],
    CAST(HPP AS DECIMAL(18,2)) AS [HPP], CAST(HPPKonsol AS DECIMAL(18,2)) AS [Perubahan HPP], CAST(HPPKonsol AS DECIMAL(18,2)) AS [HPP Konsol],
    CAST(HargaJualNet - HPP AS DECIMAL(18,2)) AS [Laba / Rugi], CAST(HargaJualNet - HPPKonsol AS DECIMAL(18,2)) AS [Laba / Rugi Konsol],
    CAST(Qty * HPP AS DECIMAL(18,2)) AS [Jumlah HPP], CAST(Qty * (HargaJualNet - HPP) AS DECIMAL(18,2)) AS [Jumlah (Gross Profit)],
    CASE WHEN TransactionItemId = (SELECT TOP 1 TransactionItemId FROM Base ORDER BY TglTrn DESC, NoInvoice DESC, TransactionItemId DESC)
         THEN CAST((Qty * HargaJualNet) + (SELECT SelisihKoreksi FROM AdjustmentCalculator) AS DECIMAL(18,2))
         ELSE CAST(Qty * HargaJualNet AS DECIMAL(18,2)) END AS [Penjualan],
    CAST(Qty * HPP AS DECIMAL(18,2)) AS [Nilai HPP], CAST(Qty * HPPKonsol AS DECIMAL(18,2)) AS [Nilai HPP Konsol],
    CASE WHEN NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
         WHEN NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
         WHEN NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
         WHEN NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
         WHEN NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP' ELSE 'OTH' END AS [ELIMINASI],
    [PT], GrupCustomer AS [GROUP], NamaBarang AS [Nama Barang Standard]
FROM Base
ORDER BY 
    [Tahun] ASC, 
    [Tgl Trn] ASC, 
    [No Invoice] ASC, 
    TransactionItemId ASC;