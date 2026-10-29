-- ====================================================================
-- Script Name: qry_master_consolidate_agc_2024_2026_raw_erp.sql
-- Description: Master Konsolidasi Raw ERP PT AMG (2024 - 2026)
--              Tab 1: Operasional IT & Gudang (Murni ERP Tanpa Koreksi)
-- ====================================================================

SELECT * FROM (
    /* ============================================================
       1. RAW ERP TAHUN 2024 (Database: AGCdb001)
       ============================================================ */
    SELECT
        CAST(MONTH(TglTrn) AS INT) AS [Periode],
        CAST(YEAR(TglTrn) AS INT) AS [Tahun],
        CAST(NoInvoice AS VARCHAR(100)) AS [No Invoice],
        CAST(TglTrn AS DATE) AS [Tgl Trn],
        CAST(NamaCustomer AS VARCHAR(255)) AS [Nama Customer],
        CAST(Produk AS VARCHAR(100)) AS [Produk],
        CAST(NamaSales AS VARCHAR(100)) AS [Nama Sales],
        CAST(KodeBarang AS VARCHAR(50)) AS [Kode Barang],
        CAST(NamaBarang AS VARCHAR(255)) AS [Nama Barang],
        CAST(Qty AS DECIMAL(18,2)) AS [Qty],
        CAST(UM AS VARCHAR(20)) AS [U/M],
        CAST(HargaJualNet AS DECIMAL(18,5)) AS [Harga Jual Net],
        CAST(HPP AS DECIMAL(18,2)) AS [HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [Perubahan HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [HPP Konsol],
        CAST(LabaRugi AS DECIMAL(18,2)) AS [Laba / Rugi],
        CAST(LabaRugi AS DECIMAL(18,2)) AS [Laba / Rugi Konsol],
        CAST(JumlahHPP AS DECIMAL(18,2)) AS [Jumlah HPP],
        CAST(GrossProfit AS DECIMAL(18,2)) AS [Jumlah (Gross Profit)],
        ROUND(Penjualan, 0) AS [Penjualan],
        ROUND(NilaiHPP, 0) AS [Nilai HPP],
        CAST(NilaiHPP AS DECIMAL(18,2)) AS [Nilai HPP Konsol],
        CAST(Eliminasi AS VARCHAR(10)) AS [ELIMINASI],
        CAST(PT AS VARCHAR(10)) AS [PT],
        CAST(GrupCustomer AS VARCHAR(100)) AS [GROUP],
        CAST(NamaBarangStd AS VARCHAR(255)) AS [Nama Barang Standard],
        CAST(TransactionItemId AS UNIQUEIDENTIFIER) AS TransactionItemId
    FROM (
        SELECT r.*, 
            CAST(r.HPP AS DECIMAL(18,2)) AS HPPKonsol,
            CAST(r.HargaJualNet - r.HPP AS DECIMAL(18,2)) AS LabaRugi,
            CAST(r.Qty * r.HPP AS DECIMAL(18,2)) AS JumlahHPP,
            CAST(r.Qty * (r.HargaJualNet - r.HPP) AS DECIMAL(18,2)) AS GrossProfit,
            CAST(r.Qty * r.HargaJualNet AS DECIMAL(18,2)) AS Penjualan,
            CAST(r.Qty * r.HPP AS DECIMAL(18,2)) AS NilaiHPP,
            CASE 
                WHEN r.NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
                WHEN r.NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
                WHEN r.NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
                WHEN r.NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
                WHEN r.NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
                ELSE 'OTH'
            END AS Eliminasi,
            r.NamaBarang AS NamaBarangStd
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY TahunDb, TransactionItemId, NoInvoice ORDER BY CASE WHEN YEAR(TglTrn) = TahunDb THEN 0 ELSE 1 END, TahunDb DESC) AS rn
            FROM (
                SELECT *, CASE WHEN InvoiceTotalSubtotal > 0 THEN (BaseHargaNet / PpnDivider) - (((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal) * HeaderExtDisc / NULLIF(Qty, 0)) ELSE (BaseHargaNet / PpnDivider) END AS HargaJualNet
                FROM (
                    SELECT *, (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal, SUM(Qty * BaseHargaNet / PpnDivider) OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal
                    FROM (
                        SELECT
                            'AMG' AS [PT], 2024 AS TahunDb,
                            LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice, 
                            CAST(sih.TglFaktur AS DATE) AS TglTrn,
                            ISNULL(c.NamaLgn, 'Lain-Lain') AS NamaCustomer,
                            ISNULL(cat.NamaKategory, 'UMUM') AS Produk,
                            ISNULL(inv.KodeItem, sii.Barcode) AS KodeBarang,  
                            ISNULL(sii.NamaBarang, inv.NamaBarang) AS NamaBarang,
                            sii.Qty AS Qty,
                            ISNULL(sii.SatuanNs, inv.KodeSatuan) AS UM,
                            COALESCE(NULLIF(sii.HargaNet, 0), (((sii.HargaJual * (1.0 - ISNULL(sii.ItemDisPsn, 0)/100.0)) - ISNULL(sii.ItemDisc, 0)) * (1.0 - ISNULL(sii.ItemDisPsn2, 0)/100.0) - ISNULL(sii.ItemDisc2, 0)) * (1.0 - ISNULL(sii.ItemDisPsn3, 0)/100.0) - ISNULL(sii.ItemDisc3, 0)) AS BaseHargaNet,
                            CASE WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I' THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0 ELSE 1.0 END AS PpnDivider,
                            ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
                            sii.HargaPokok AS HPP,
                            ISNULL(sm.NamaSales, 'Tidak Ada Salesman') AS NamaSales,
                            ISNULL(cg.CustomerGroupCode, c.NamaLgn) AS GrupCustomer,
                            sii.SalesInvoiceItemId AS TransactionItemId
                        FROM [AGCdb001].[dbo].[SalesInvoiceItems] sii
                        INNER JOIN [AGCdb001].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
                        LEFT JOIN [AGCdb001].[dbo].[InventoryStocks] istok ON sii.InventoryStockId = istok.InventoryStockId
                        LEFT JOIN [AGCdb001].[dbo].[Inventories] inv ON istok.InventoryId = inv.InventoryId
                        LEFT JOIN [AGCdb001].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
                        LEFT JOIN [AGCdb001].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                        LEFT JOIN [AGCdb001].[dbo].[CustomerGroups] cg ON c.CustomerGroupId = cg.CustomerGroupId
                        LEFT JOIN [AGCdb001].[dbo].[Salesmen] sm ON sih.KodeSales = sm.KodeSales
                        WHERE sih.TglFaktur >= '2024-01-01' AND sih.TglFaktur < '2025-01-01'
                    ) A
                ) B
            ) C
        ) r WHERE r.rn = 1
    ) Sub2024
) AS Raw2024

UNION ALL

SELECT * FROM (
    /* ============================================================
       2. RAW ERP TAHUN 2025 (Database: AGCdb002)
       ============================================================ */
    SELECT
        CAST(MONTH(TglTrn) AS INT) AS [Periode],
        CAST(YEAR(TglTrn) AS INT) AS [Tahun],
        CAST(NoInvoice AS VARCHAR(100)) AS [No Invoice],
        CAST(TglTrn AS DATE) AS [Tgl Trn],
        CAST(NamaCustomer AS VARCHAR(255)) AS [Nama Customer],
        CAST(Produk AS VARCHAR(100)) AS [Produk],
        CAST(NamaSales AS VARCHAR(100)) AS [Nama Sales],
        CAST(KodeBarang AS VARCHAR(50)) AS [Kode Barang],
        CAST(NamaBarang AS VARCHAR(255)) AS [Nama Barang],
        CAST(Qty AS DECIMAL(18,2)) AS [Qty],
        CAST(UM AS VARCHAR(20)) AS [U/M],
        CAST(HargaJualNet AS DECIMAL(18,5)) AS [Harga Jual Net],
        CAST(HPP AS DECIMAL(18,2)) AS [HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [Perubahan HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [HPP Konsol],
        CAST(LabaRugi AS DECIMAL(18,2)) AS [Laba / Rugi],
        CAST(LabaRugi AS DECIMAL(18,2)) AS [Laba / Rugi Konsol],
        CAST(JumlahHPP AS DECIMAL(18,2)) AS [Jumlah HPP],
        CAST(GrossProfit AS DECIMAL(18,2)) AS [Jumlah (Gross Profit)],
        ROUND(Penjualan, 0) AS [Penjualan],
        ROUND(NilaiHPP, 0) AS [Nilai HPP],
        CAST(NilaiHPP AS DECIMAL(18,2)) AS [Nilai HPP Konsol],
        CAST(Eliminasi AS VARCHAR(10)) AS [ELIMINASI],
        CAST(PT AS VARCHAR(10)) AS [PT],
        CAST(GrupCustomer AS VARCHAR(100)) AS [GROUP],
        CAST(NamaBarangStd AS VARCHAR(255)) AS [Nama Barang Standard],
        CAST(TransactionItemId AS UNIQUEIDENTIFIER) AS TransactionItemId
    FROM (
        SELECT r.*, 
            CAST(r.HPP AS DECIMAL(18,2)) AS HPPKonsol,
            CAST(r.HargaJualNet - r.HPP AS DECIMAL(18,2)) AS LabaRugi,
            CAST(r.Qty * r.HPP AS DECIMAL(18,2)) AS JumlahHPP,
            CAST(r.Qty * (r.HargaJualNet - r.HPP) AS DECIMAL(18,2)) AS GrossProfit,
            CAST(r.Qty * r.HargaJualNet AS DECIMAL(18,2)) AS Penjualan,
            CAST(r.Qty * r.HPP AS DECIMAL(18,2)) AS NilaiHPP,
            CASE 
                WHEN r.NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
                WHEN r.NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
                WHEN r.NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
                WHEN r.NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
                WHEN r.NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
                ELSE 'OTH'
            END AS Eliminasi,
            r.NamaBarang AS NamaBarangStd
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY TahunDb, TransactionItemId, NoInvoice ORDER BY CASE WHEN YEAR(TglTrn) = TahunDb THEN 0 ELSE 1 END, TahunDb DESC) AS rn
            FROM (
                SELECT *, CASE WHEN InvoiceTotalSubtotal > 0 THEN (BaseHargaNet / PpnDivider) - (((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal) * HeaderExtDisc / NULLIF(Qty, 0)) ELSE (BaseHargaNet / PpnDivider) END AS HargaJualNet
                FROM (
                    SELECT *, (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal, SUM(Qty * BaseHargaNet / PpnDivider) OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal
                    FROM (
                        SELECT
                            'AMG' AS [PT], 2025 AS TahunDb,
                            LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice, 
                            CAST(sih.TglFaktur AS DATE) AS TglTrn,
                            ISNULL(c.NamaLgn, 'Lain-Lain') AS NamaCustomer,
                            ISNULL(cat.NamaKategory, 'UMUM') AS Produk,
                            ISNULL(inv.KodeItem, sii.Barcode) AS KodeBarang,  
                            ISNULL(sii.NamaBarang, inv.NamaBarang) AS NamaBarang,
                            sii.Qty AS Qty,
                            ISNULL(sii.SatuanNs, inv.KodeSatuan) AS UM,
                            COALESCE(NULLIF(sii.HargaNet, 0), (((sii.HargaJual * (1.0 - ISNULL(sii.ItemDisPsn, 0)/100.0)) - ISNULL(sii.ItemDisc, 0)) * (1.0 - ISNULL(sii.ItemDisPsn2, 0)/100.0) - ISNULL(sii.ItemDisc2, 0)) * (1.0 - ISNULL(sii.ItemDisPsn3, 0)/100.0) - ISNULL(sii.ItemDisc3, 0)) AS BaseHargaNet,
                            CASE WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I' THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0 ELSE 1.0 END AS PpnDivider,
                            ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
                            sii.HargaPokok AS HPP,
                            ISNULL(sm.NamaSales, 'Tidak Ada Salesman') AS NamaSales,
                            ISNULL(cg.CustomerGroupCode, c.NamaLgn) AS GrupCustomer,
                            sii.SalesInvoiceItemId AS TransactionItemId
                        FROM [AGCdb002].[dbo].[SalesInvoiceItems] sii
                        INNER JOIN [AGCdb002].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
                        LEFT JOIN [AGCdb002].[dbo].[InventoryStocks] istok ON sii.InventoryStockId = istok.InventoryStockId
                        LEFT JOIN [AGCdb002].[dbo].[Inventories] inv ON istok.InventoryId = inv.InventoryId
                        LEFT JOIN [AGCdb002].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
                        LEFT JOIN [AGCdb002].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                        LEFT JOIN [AGCdb002].[dbo].[CustomerGroups] cg ON c.CustomerGroupId = cg.CustomerGroupId
                        LEFT JOIN [AGCdb002].[dbo].[Salesmen] sm ON sih.KodeSales = sm.KodeSales
                        WHERE sih.TglFaktur >= '2025-01-01' AND sih.TglFaktur < '2026-01-01'
                    ) A
                ) B
            ) C
        ) r WHERE r.rn = 1
    ) Sub2025
) AS Raw2025

UNION ALL

SELECT * FROM (
    /* ============================================================
       3. RAW ERP TAHUN 2026 (Database: AGCdb003)
       ============================================================ */
    SELECT
        CAST(MONTH(TglTrn) AS INT) AS [Periode],
        CAST(YEAR(TglTrn) AS INT) AS [Tahun],
        CAST(NoInvoice AS VARCHAR(100)) AS [No Invoice],
        CAST(TglTrn AS DATE) AS [Tgl Trn],
        CAST(NamaCustomer AS VARCHAR(255)) AS [Nama Customer],
        CAST(Produk AS VARCHAR(100)) AS [Produk],
        CAST(NamaSales AS VARCHAR(100)) AS [Nama Sales],
        CAST(KodeBarang AS VARCHAR(50)) AS [Kode Barang],
        CAST(NamaBarang AS VARCHAR(255)) AS [Nama Barang],
        CAST(Qty AS DECIMAL(18,2)) AS [Qty],
        CAST(UM AS VARCHAR(20)) AS [U/M],
        CAST(HargaJualNet AS DECIMAL(18,5)) AS [Harga Jual Net],
        CAST(HPP AS DECIMAL(18,2)) AS [HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [Perubahan HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [HPP Konsol],
        CAST(LabaRugi AS DECIMAL(18,2)) AS [Laba / Rugi],
        CAST(LabaRugi AS DECIMAL(18,2)) AS [Laba / Rugi Konsol],
        CAST(JumlahHPP AS DECIMAL(18,2)) AS [Jumlah HPP],
        CAST(GrossProfit AS DECIMAL(18,2)) AS [Jumlah (Gross Profit)],
        ROUND(Penjualan, 0) AS [Penjualan],
        ROUND(NilaiHPP, 0) AS [Nilai HPP],
        CAST(NilaiHPP AS DECIMAL(18,2)) AS [Nilai HPP Konsol],
        CAST(Eliminasi AS VARCHAR(10)) AS [ELIMINASI],
        CAST(PT AS VARCHAR(10)) AS [PT],
        CAST(GrupCustomer AS VARCHAR(100)) AS [GROUP],
        CAST(NamaBarangStd AS VARCHAR(255)) AS [Nama Barang Standard],
        CAST(TransactionItemId AS UNIQUEIDENTIFIER) AS TransactionItemId
    FROM (
        SELECT r.*, 
            CAST(r.HPP AS DECIMAL(18,2)) AS HPPKonsol,
            CAST(r.HargaJualNet - r.HPP AS DECIMAL(18,2)) AS LabaRugi,
            CAST(r.Qty * r.HPP AS DECIMAL(18,2)) AS JumlahHPP,
            CAST(r.Qty * (r.HargaJualNet - r.HPP) AS DECIMAL(18,2)) AS GrossProfit,
            CAST(r.Qty * r.HargaJualNet AS DECIMAL(18,2)) AS Penjualan,
            CAST(r.Qty * r.HPP AS DECIMAL(18,2)) AS NilaiHPP,
            CASE 
                WHEN r.NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
                WHEN r.NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
                WHEN r.NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
                WHEN r.NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
                WHEN r.NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
                ELSE 'OTH'
            END AS Eliminasi,
            r.NamaBarang AS NamaBarangStd
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY TahunDb, TransactionItemId, NoInvoice ORDER BY CASE WHEN YEAR(TglTrn) = TahunDb THEN 0 ELSE 1 END, TahunDb DESC) AS rn
            FROM (
                SELECT *, CASE WHEN InvoiceTotalSubtotal > 0 THEN (BaseHargaNet / PpnDivider) - (((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal) * HeaderExtDisc / NULLIF(Qty, 0)) ELSE (BaseHargaNet / PpnDivider) END AS HargaJualNet
                FROM (
                    SELECT *, (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal, SUM(Qty * BaseHargaNet / PpnDivider) OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal
                    FROM (
                        SELECT
                            'AMG' AS [PT], 2026 AS TahunDb,
                            LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice, 
                            CAST(sih.TglFaktur AS DATE) AS TglTrn,
                            ISNULL(c.NamaLgn, 'Lain-Lain') AS NamaCustomer,
                            ISNULL(cat.NamaKategory, 'UMUM') AS Produk,
                            ISNULL(inv.KodeItem, sii.Barcode) AS KodeBarang,  
                            ISNULL(sii.NamaBarang, inv.NamaBarang) AS NamaBarang,
                            sii.Qty AS Qty,
                            ISNULL(sii.SatuanNs, inv.KodeSatuan) AS UM,
                            COALESCE(NULLIF(sii.HargaNet, 0), (((sii.HargaJual * (1.0 - ISNULL(sii.ItemDisPsn, 0)/100.0)) - ISNULL(sii.ItemDisc, 0)) * (1.0 - ISNULL(sii.ItemDisPsn2, 0)/100.0) - ISNULL(sii.ItemDisc2, 0)) * (1.0 - ISNULL(sii.ItemDisPsn3, 0)/100.0) - ISNULL(sii.ItemDisc3, 0)) AS BaseHargaNet,
                            CASE WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I' THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0 ELSE 1.0 END AS PpnDivider,
							ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
                            sii.HargaPokok AS HPP,
                            ISNULL(sm.NamaSales, 'Tidak Ada Salesman') AS NamaSales,
                            ISNULL(cg.CustomerGroupCode, c.NamaLgn) AS GrupCustomer,
                            sii.SalesInvoiceItemId AS TransactionItemId
                        FROM [AGCdb003].[dbo].[SalesInvoiceItems] sii
                        INNER JOIN [AGCdb003].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
                        LEFT JOIN [AGCdb003].[dbo].[InventoryStocks] istok ON sii.InventoryStockId = istok.InventoryStockId
                        LEFT JOIN [AGCdb003].[dbo].[Inventories] inv ON istok.InventoryId = inv.InventoryId
                        LEFT JOIN [AGCdb003].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
                        LEFT JOIN [AGCdb003].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                        LEFT JOIN [AGCdb003].[dbo].[CustomerGroups] cg ON c.CustomerGroupId = cg.CustomerGroupId
                        LEFT JOIN [AGCdb003].[dbo].[Salesmen] sm ON sih.KodeSales = sm.KodeSales
                        WHERE sih.TglFaktur >= '2026-01-01' AND sih.TglFaktur < '2027-01-01'
                    ) A
                ) B
            ) C
        ) r WHERE r.rn = 1
    ) Sub2026
) AS Raw2026

ORDER BY 
    [Tahun] ASC, 
    [Tgl Trn] ASC, 
    [No Invoice] ASC, 
    TransactionItemId ASC;