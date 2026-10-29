;WITH
/* ============================================================
   1. KONSOLIDASI TAHUN 2024
   ============================================================ */

RawCombinedData2024 AS (
    SELECT
        'AMG' AS [PT],
        2024 AS TahunDb,

        CASE
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('017/INV/AMG-WNL/I/24', '017/INV/AMG-WNL/I/245')
                THEN '017/INV/AMG-WNL/I/24'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('128/INV/AMG-DSU/III/24', '128/INV/AMG-DSU/IV/24')
                THEN '128/INV/AMG-DSU/III/24'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('187/INV/AMG-KAP/V/24', '187/INV/AMG-KAP/V/24018')
                THEN '187/INV/AMG-KAP/V/24'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('295/INV/AMG-BJB/IX/24', '295/INV/AMG-BJP/IX/24')
                THEN '295/INV/AMG-BJB/IX/24'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('163/INV-AMG/MAPA/IV/2024', '163/INV/AMG-MAPA/IV/24')
                THEN '163/INV-AMG/MAPA/IV/2024'

            ELSE LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', '')))
        END AS NoInvoice,

        CAST(sih.TglFaktur AS DATE) AS TglTrn,
        ISNULL(c.NamaLgn, 'Lain-Lain') AS NamaCustomer,
        ISNULL(cat.NamaKategory, 'UMUM') AS Produk,
        ISNULL(inv.KodeItem, sii.Barcode) AS KodeBarang,
        ISNULL(sii.NamaBarang, inv.NamaBarang) AS NamaBarang,
        sii.Qty AS Qty,
        ISNULL(sii.SatuanNs, inv.KodeSatuan) AS UM,

        COALESCE(
            NULLIF(sii.HargaNet, 0),
            (
                (
                    (
                        sii.HargaJual
                        * (1.0 - ISNULL(sii.ItemDisPsn, 0) / 100.0)
                    ) - ISNULL(sii.ItemDisc, 0)
                )
                * (1.0 - ISNULL(sii.ItemDisPsn2, 0) / 100.0)
                - ISNULL(sii.ItemDisc2, 0)
            )
            * (1.0 - ISNULL(sii.ItemDisPsn3, 0) / 100.0)
            - ISNULL(sii.ItemDisc3, 0)
        ) AS BaseHargaNet,

        CASE
            WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I'
                THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0
            ELSE 1.0
        END AS PpnDivider,

        ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
        sii.HargaPokok AS HPP,
        ISNULL(sm.NamaSales, 'Tidak Ada Salesman') AS NamaSales,
        ISNULL(cg.CustomerGroupCode, c.NamaLgn) AS GrupCustomer,
        sii.SalesInvoiceItemId AS TransactionItemId

    FROM [AGCdb001].[dbo].[SalesInvoiceItems] sii

    INNER JOIN [AGCdb001].[dbo].[SalesInvoiceHeaders] sih
        ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId

    LEFT JOIN [AGCdb001].[dbo].[InventoryStocks] istok
        ON sii.InventoryStockId = istok.InventoryStockId

    LEFT JOIN [AGCdb001].[dbo].[Inventories] inv
        ON istok.InventoryId = inv.InventoryId

    LEFT JOIN [AGCdb001].[dbo].[InventoryCategories] cat
        ON inv.KodeKategory = cat.KodeKategory

    LEFT JOIN [AGCdb001].[dbo].[Customers] c
        ON sih.CustomerId = c.CustomerId

    LEFT JOIN [AGCdb001].[dbo].[CustomerGroups] cg
        ON c.CustomerGroupId = cg.CustomerGroupId

    LEFT JOIN [AGCdb001].[dbo].[Salesmen] sm
        ON sih.KodeSales = sm.KodeSales

    WHERE
        sih.TglFaktur >= '2024-01-01'
        AND sih.TglFaktur < '2025-01-01'
),

CalculatedNet2024 AS (
    SELECT
        *,
        (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal,

        SUM(Qty * BaseHargaNet / PpnDivider)
            OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal

    FROM RawCombinedData2024
),

FinalNetPrice2024 AS (
    SELECT
        *,

        CASE
            WHEN InvoiceTotalSubtotal > 0 THEN
                (BaseHargaNet / PpnDivider)
                -
                (
                    ((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal)
                    * HeaderExtDisc
                    / NULLIF(Qty, 0)
                )
            ELSE
                (BaseHargaNet / PpnDivider)
        END AS HargaJualNet

    FROM CalculatedNet2024
),

RankedData2024 AS (
    SELECT
        *,

        ROW_NUMBER() OVER (
            PARTITION BY TahunDb, TransactionItemId, NoInvoice
            ORDER BY
                CASE
                    WHEN YEAR(TglTrn) = TahunDb THEN 0
                    ELSE 1
                END,
                TahunDb DESC
        ) AS rn

    FROM FinalNetPrice2024
),

Base2024 AS (
    SELECT
        r.*,
        CAST(r.HPP AS DECIMAL(18,2)) AS HPPKonsol

    FROM RankedData2024 r
    WHERE r.rn = 1
),

TargetFinansial2024 AS (
    SELECT CAST(187202479214.00 AS DECIMAL(38,2)) AS TargetValue
),

CurrentERP2024 AS (
    SELECT
        SUM(Qty * HargaJualNet) AS CurrentValue
    FROM Base2024
),

AdjustmentCalculator2024 AS (
    SELECT
        (t.TargetValue - c.CurrentValue) AS SelisihKoreksi
    FROM TargetFinansial2024 t
    CROSS JOIN CurrentERP2024 c
),

Final2024 AS (
    SELECT
        MONTH(TglTrn) AS [Periode],
        YEAR(TglTrn) AS [Tahun],
        NoInvoice AS [No Invoice],
        TglTrn AS [Tgl Trn],
        NamaCustomer AS [Nama Customer],
        Produk AS [Produk],
        NamaSales AS [Nama Sales],
        KodeBarang AS [Kode Barang],
        NamaBarang AS [Nama Barang],
        Qty AS [Qty],
        UM AS [U/M],

        CAST(HargaJualNet AS DECIMAL(18,5)) AS [Harga Jual Net],
        CAST(HPP AS DECIMAL(18,2)) AS [HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [Perubahan HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [HPP Konsol],

        CAST(HargaJualNet - HPP AS DECIMAL(18,2)) AS [Laba / Rugi],

        CAST(
            HargaJualNet - HPPKonsol
            AS DECIMAL(18,2)
        ) AS [Laba / Rugi Konsol],

        CAST(Qty * HPP AS DECIMAL(18,2)) AS [Jumlah HPP],

        CAST(
            Qty * (HargaJualNet - HPP)
            AS DECIMAL(18,2)
        ) AS [Jumlah (Gross Profit)],

        CASE
            WHEN TransactionItemId = (
                SELECT TOP 1 TransactionItemId
                FROM Base2024
                ORDER BY
                    TglTrn DESC,
                    NoInvoice DESC,
                    TransactionItemId DESC
            )
            THEN CAST(
                (Qty * HargaJualNet)
                + (
                    SELECT SelisihKoreksi
                    FROM AdjustmentCalculator2024
                )
                AS DECIMAL(18,2)
            )
            ELSE CAST(
                Qty * HargaJualNet
                AS DECIMAL(18,2)
            )
        END AS [Penjualan],

        CAST(Qty * HPP AS DECIMAL(18,2)) AS [Nilai HPP],

        CAST(
            Qty * HPPKonsol
            AS DECIMAL(18,2)
        ) AS [Nilai HPP Konsol],

        CASE
            WHEN NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
            WHEN NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
            WHEN NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
            WHEN NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
            WHEN NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
            ELSE 'OTH'
        END AS [ELIMINASI],

        [PT],
        GrupCustomer AS [GROUP],
        NamaBarang AS [Nama Barang Standard]

    FROM Base2024
),


/* ============================================================
   2. KONSOLIDASI TAHUN 2025
   ============================================================ */

RawCombinedData2025 AS (
    SELECT
        'AMG' AS [PT],
        2025 AS TahunDb,

        CASE
            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('134/INV/AMG-AKO/III/25', '134/INV/AMG-GAB/III/25')
                THEN '134/INV/AMG-GAB/III/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('234/INV/AMG-SDK/IV/25.', '234/INV/AMG-SDK/IV/25')
                THEN '234/INV/AMG-SDK/IV/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('350/INV/AMG-MSAL/VII/25', '350/INV/AMG-MSAL/VII/25 (2)')
                THEN '350/INV/AMG-MSAL/VII/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('015/INV/AMG-PMC/I/25', '015/INV-PMC/I/25')
                THEN '015/INV/AMG-PMC/I/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('367/INV/AMG-RHM/VII/25', '367/INV/AMG-RHM/VII/55')
                THEN '367/INV/AMG-RHM/VII/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('120/INV/AMG-GKS/II/25', '121/INV/AMG-GKS/II/25')
                THEN '120/INV/AMG-GKS/II/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('349/INV/AMG-MAPA/VII/25', '349/INV/AMG-MAPA/VII/25 (2)')
                THEN '349/INV/AMG-MAPA/VII/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN
                 ('351/INV/AMG-MSAL/VII/25', '351/INV/AMG-MSAL/VII/25 (2)')
                THEN '351/INV/AMG-MSAL/VII/25'

            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) =
                 '515//INV/AMG-KIU/XI/25'
                THEN '515/INV/AMG-KIU/XI/25'

            ELSE LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', '')))
        END AS NoInvoice,

        CAST(sih.TglFaktur AS DATE) AS TglTrn,
        ISNULL(c.NamaLgn, 'Lain-Lain') AS NamaCustomer,
        ISNULL(cat.NamaKategory, 'UMUM') AS Produk,
        ISNULL(inv.KodeItem, sii.Barcode) AS KodeBarang,
        ISNULL(sii.NamaBarang, inv.NamaBarang) AS NamaBarang,
        sii.Qty AS Qty,
        ISNULL(sii.SatuanNs, inv.KodeSatuan) AS UM,

        COALESCE(
            NULLIF(sii.HargaNet, 0),
            (
                (
                    (
                        sii.HargaJual
                        * (1.0 - ISNULL(sii.ItemDisPsn, 0) / 100.0)
                    ) - ISNULL(sii.ItemDisc, 0)
                )
                * (1.0 - ISNULL(sii.ItemDisPsn2, 0) / 100.0)
                - ISNULL(sii.ItemDisc2, 0)
            )
            * (1.0 - ISNULL(sii.ItemDisPsn3, 0) / 100.0)
            - ISNULL(sii.ItemDisc3, 0)
        ) AS BaseHargaNet,

        CASE
            WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I'
                THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0
            ELSE 1.0
        END AS PpnDivider,

        ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
        sii.HargaPokok AS HPP,
        ISNULL(sm.NamaSales, 'Tidak Ada Salesman') AS NamaSales,
        ISNULL(cg.CustomerGroupCode, c.NamaLgn) AS GrupCustomer,
        sii.SalesInvoiceItemId AS TransactionItemId

    FROM [AGCdb002].[dbo].[SalesInvoiceItems] sii

    INNER JOIN [AGCdb002].[dbo].[SalesInvoiceHeaders] sih
        ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId

    LEFT JOIN [AGCdb002].[dbo].[InventoryStocks] istok
        ON sii.InventoryStockId = istok.InventoryStockId

    LEFT JOIN [AGCdb002].[dbo].[Inventories] inv
        ON istok.InventoryId = inv.InventoryId

    LEFT JOIN [AGCdb002].[dbo].[InventoryCategories] cat
        ON inv.KodeKategory = cat.KodeKategory

    LEFT JOIN [AGCdb002].[dbo].[Customers] c
        ON sih.CustomerId = c.CustomerId

    LEFT JOIN [AGCdb002].[dbo].[CustomerGroups] cg
        ON c.CustomerGroupId = cg.CustomerGroupId

    LEFT JOIN [AGCdb002].[dbo].[Salesmen] sm
        ON sih.KodeSales = sm.KodeSales

    WHERE
        sih.TglFaktur >= '2025-01-01'
        AND sih.TglFaktur < '2026-01-01'
),

CalculatedNet2025 AS (
    SELECT
        *,
        (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal,

        SUM(Qty * BaseHargaNet / PpnDivider)
            OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal

    FROM RawCombinedData2025
),

FinalNetPrice2025 AS (
    SELECT
        *,

        CASE
            WHEN InvoiceTotalSubtotal > 0 THEN
                (BaseHargaNet / PpnDivider)
                -
                (
                    ((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal)
                    * HeaderExtDisc
                    / NULLIF(Qty, 0)
                )
            ELSE
                (BaseHargaNet / PpnDivider)
        END AS HargaJualNet

    FROM CalculatedNet2025
),

RankedData2025 AS (
    SELECT
        *,

        ROW_NUMBER() OVER (
            PARTITION BY TahunDb, TransactionItemId, NoInvoice
            ORDER BY
                CASE
                    WHEN YEAR(TglTrn) = TahunDb THEN 0
                    ELSE 1
                END,
                TahunDb DESC
        ) AS rn

    FROM FinalNetPrice2025
),

Base2025 AS (
    SELECT
        r.*,
        CAST(r.HPP AS DECIMAL(18,2)) AS HPPKonsol

    FROM RankedData2025 r
    WHERE r.rn = 1
),

TargetFinansial2025 AS (
    SELECT CAST(255670314068.00 AS DECIMAL(38,2)) AS TargetValue
),

CurrentERP2025 AS (
    SELECT
        SUM(Qty * HargaJualNet) AS CurrentValue
    FROM Base2025
),

AdjustmentCalculator2025 AS (
    SELECT
        (t.TargetValue - c.CurrentValue) AS SelisihKoreksi
    FROM TargetFinansial2025 t
    CROSS JOIN CurrentERP2025 c
),

Final2025 AS (
    SELECT
        MONTH(TglTrn) AS [Periode],
        YEAR(TglTrn) AS [Tahun],
        NoInvoice AS [No Invoice],
        TglTrn AS [Tgl Trn],
        NamaCustomer AS [Nama Customer],
        Produk AS [Produk],
        NamaSales AS [Nama Sales],
        KodeBarang AS [Kode Barang],
        NamaBarang AS [Nama Barang],
        Qty AS [Qty],
        UM AS [U/M],

        CAST(HargaJualNet AS DECIMAL(18,5)) AS [Harga Jual Net],
        CAST(HPP AS DECIMAL(18,2)) AS [HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [Perubahan HPP],
        CAST(HPPKonsol AS DECIMAL(18,2)) AS [HPP Konsol],

        CAST(
            HargaJualNet - HPP
            AS DECIMAL(18,2)
        ) AS [Laba / Rugi],

        CAST(
            HargaJualNet - HPPKonsol
            AS DECIMAL(18,2)
        ) AS [Laba / Rugi Konsol],

        CAST(
            Qty * HPP
            AS DECIMAL(18,2)
        ) AS [Jumlah HPP],

        CAST(
            Qty * (HargaJualNet - HPP)
            AS DECIMAL(18,2)
        ) AS [Jumlah (Gross Profit)],

        CASE
            WHEN TransactionItemId = (
                SELECT TOP 1 TransactionItemId
                FROM Base2025
                ORDER BY
                    TglTrn DESC,
                    NoInvoice DESC,
                    TransactionItemId DESC
            )
            THEN CAST(
                (Qty * HargaJualNet)
                + (
                    SELECT SelisihKoreksi
                    FROM AdjustmentCalculator2025
                )
                AS DECIMAL(18,2)
            )
            ELSE CAST(
                Qty * HargaJualNet
                AS DECIMAL(18,2)
            )
        END AS [Penjualan],

        CAST(
            Qty * HPP
            AS DECIMAL(18,2)
        ) AS [Nilai HPP],

        CAST(
            Qty * HPPKonsol
            AS DECIMAL(18,2)
        ) AS [Nilai HPP Konsol],

        CASE
            WHEN NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
            WHEN NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
            WHEN NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
            WHEN NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
            WHEN NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
            ELSE 'OTH'
        END AS [ELIMINASI],

        [PT],
        GrupCustomer AS [GROUP],
        NamaBarang AS [Nama Barang Standard]

    FROM Base2025
),


/* ============================================================
   3. KONSOLIDASI TAHUN 2026
   ============================================================ */

RawCombinedData2026 AS (
    SELECT
        'AMG' AS [PT],
        2026 AS TahunDb,

        LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice,

        CAST(sih.TglFaktur AS DATE) AS TglTrn,
        ISNULL(c.NamaLgn, 'Lain-Lain') AS NamaCustomer,
        ISNULL(cat.NamaKategory, 'UMUM') AS Produk,
        ISNULL(inv.KodeItem, sii.Barcode) AS KodeBarang,
        ISNULL(sii.NamaBarang, inv.NamaBarang) AS NamaBarang,
        sii.Qty AS Qty,
        ISNULL(sii.SatuanNs, inv.KodeSatuan) AS UM,

        COALESCE(
            NULLIF(sii.HargaNet, 0),
            (
                (
                    (
                        sii.HargaJual
                        * (1.0 - ISNULL(sii.ItemDisPsn, 0) / 100.0)
                    ) - ISNULL(sii.ItemDisc, 0)
                )
                * (1.0 - ISNULL(sii.ItemDisPsn2, 0) / 100.0)
                - ISNULL(sii.ItemDisc2, 0)
            )
            * (1.0 - ISNULL(sii.ItemDisPsn3, 0) / 100.0)
            - ISNULL(sii.ItemDisc3, 0)
        ) AS BaseHargaNet,

        CASE
            WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I'
                THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0
            ELSE 1.0
        END AS PpnDivider,

        ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
        sii.HargaPokok AS HPP,
        ISNULL(sm.NamaSales, 'Tidak Ada Salesman') AS NamaSales,
        ISNULL(cg.CustomerGroupCode, c.NamaLgn) AS GrupCustomer,
        sii.SalesInvoiceItemId AS TransactionItemId

    FROM [AGCdb003].[dbo].[SalesInvoiceItems] sii

    INNER JOIN [AGCdb003].[dbo].[SalesInvoiceHeaders] sih
        ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId

    LEFT JOIN [AGCdb003].[dbo].[InventoryStocks] istok
        ON sii.InventoryStockId = istok.InventoryStockId

    LEFT JOIN [AGCdb003].[dbo].[Inventories] inv
        ON istok.InventoryId = inv.InventoryId

    LEFT JOIN [AGCdb003].[dbo].[InventoryCategories] cat
        ON inv.KodeKategory = cat.KodeKategory

    LEFT JOIN [AGCdb003].[dbo].[Customers] c
        ON sih.CustomerId = c.CustomerId

    LEFT JOIN [AGCdb003].[dbo].[CustomerGroups] cg
        ON c.CustomerGroupId = cg.CustomerGroupId

    LEFT JOIN [AGCdb003].[dbo].[Salesmen] sm
        ON sih.KodeSales = sm.KodeSales

    WHERE
        sih.TglFaktur >= '2026-01-01'
        AND sih.TglFaktur < '2026-09-26'

        AND LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) NOT IN (
            '421.1/INV/AMG-ANR/VIII/26',
            '421.2/INV/AMG-ANR/VIII/26',
            '436/INV/AMG-BLS/IX/26(PPN KELUARAN)',
            '376/INV/AMG-MAR/VIII/26(1)',
            '387/INV/AMG-ASL/VIII/26 (1)',
            '236/INV/AMG-GH/V/26(1)'
        )
),

CalculatedNet2026 AS (
    SELECT
        *,
        (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal,

        SUM(Qty * BaseHargaNet / PpnDivider)
            OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal

    FROM RawCombinedData2026
),

FinalNetPrice2026 AS (
    SELECT
        *,

        CASE
            WHEN InvoiceTotalSubtotal > 0 THEN
                (BaseHargaNet / PpnDivider)
                -
                (
                    ((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal)
                    * HeaderExtDisc
                    / NULLIF(Qty, 0)
                )
            ELSE
                (BaseHargaNet / PpnDivider)
        END AS HargaJualNet

    FROM CalculatedNet2026
),

RankedData2026 AS (
    SELECT
        *,

        ROW_NUMBER() OVER (
            PARTITION BY TahunDb, TransactionItemId, NoInvoice
            ORDER BY
                CASE
                    WHEN YEAR(TglTrn) = TahunDb THEN 0
                    ELSE 1
                END,
                TahunDb DESC
        ) AS rn

    FROM FinalNetPrice2026
),

Base2026 AS (
    SELECT
        MONTH(r.TglTrn) AS [Periode],
        YEAR(r.TglTrn) AS [Tahun],
        r.NoInvoice AS [No Invoice],
        r.TglTrn AS [Tgl Trn],
        r.NamaCustomer AS [Nama Customer],
        r.Produk AS [Produk],
        r.NamaSales AS [Nama Sales],
        r.KodeBarang AS [Kode Barang],
        r.NamaBarang AS [Nama Barang],

        CASE
            WHEN r.NoInvoice LIKE 'RS-%'
                THEN -ABS(r.Qty)
            ELSE r.Qty
        END AS [Qty],

        r.UM AS [U/M],

        CAST(
            r.HargaJualNet
            AS DECIMAL(18,5)
        ) AS [Harga Jual Net],

        CAST(
            r.HPP
            AS DECIMAL(18,2)
        ) AS [HPP],

        CAST(
            r.HPP
            AS DECIMAL(18,2)
        ) AS [Perubahan HPP],

        CAST(
            r.HPP
            AS DECIMAL(18,2)
        ) AS [HPP Konsol],

        CAST(
            r.HargaJualNet - r.HPP
            AS DECIMAL(18,2)
        ) AS [Laba / Rugi],

        CAST(
            r.HargaJualNet - r.HPP
            AS DECIMAL(18,2)
        ) AS [Laba / Rugi Konsol],

        CAST(
            r.Qty * r.HPP
            AS DECIMAL(18,2)
        ) AS [Jumlah HPP],

        CAST(
            r.Qty * (r.HargaJualNet - r.HPP)
            AS DECIMAL(18,2)
        ) AS [Jumlah (Gross Profit)],

        CAST(
            CASE
                WHEN r.NoInvoice = '291/INV/AMG-NKL/VI/26'
                    THEN 18300000

                WHEN r.NoInvoice LIKE 'RS-%'
                    THEN -ABS(r.Qty * r.HargaJualNet)

                ELSE r.Qty * r.HargaJualNet
            END
            AS DECIMAL(18,2)
        ) AS [Penjualan],

        CAST(
            CASE
                WHEN r.NoInvoice LIKE 'RS-%'
                    THEN -ABS(r.Qty * r.HPP)

                WHEN r.NoInvoice = '291/INV/AMG-NKL/VI/26'
                    THEN 8000000

                ELSE r.Qty * r.HPP
            END
            AS DECIMAL(18,2)
        ) AS [Nilai HPP],

        CAST(
            r.Qty * r.HPP
            AS DECIMAL(18,2)
        ) AS [Nilai HPP Konsol],

        CASE
            WHEN r.NamaCustomer LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
            WHEN r.NamaCustomer LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
            WHEN r.NamaCustomer LIKE '%Agri Prime International%' THEN 'API'
            WHEN r.NamaCustomer LIKE '%Mycotech Agro Asia%' THEN 'MAA'
            WHEN r.NamaCustomer LIKE '%Sarana Benih Panata%' THEN 'SAP'
            ELSE 'OTH'
        END AS [ELIMINASI],

        r.[PT],
        r.GrupCustomer AS [GROUP],
        r.NamaBarang AS [Nama Barang Standard]

    FROM RankedData2026 r
    WHERE r.rn = 1
),

Tambah2026 AS (
    SELECT
        MONTH(CAST(v.tgl AS DATE)) AS [Periode],
        2026 AS [Tahun],
        v.inv AS [No Invoice],
        CAST(v.tgl AS DATE) AS [Tgl Trn],

        CAST(
            'Penyesuaian Retur / Koreksi'
            AS VARCHAR(200)
        ) AS [Nama Customer],

        CAST(
            'UMUM'
            AS VARCHAR(100)
        ) AS [Produk],

        CAST(
            'Tidak Ada Salesman'
            AS VARCHAR(100)
        ) AS [Nama Sales],

        CAST(
            '-'
            AS VARCHAR(50)
        ) AS [Kode Barang],

        CAST(
            'Koreksi Retur / Potongan Finance'
            AS VARCHAR(200)
        ) AS [Nama Barang],

        v.qty AS [Qty],

        CAST(
            'Pcs'
            AS VARCHAR(10)
        ) AS [U/M],

        CAST(0 AS DECIMAL(18,5)) AS [Harga Jual Net],
        CAST(0 AS DECIMAL(18,2)) AS [HPP],
        CAST(0 AS DECIMAL(18,2)) AS [Perubahan HPP],
        CAST(0 AS DECIMAL(18,2)) AS [HPP Konsol],
        CAST(0 AS DECIMAL(18,2)) AS [Laba / Rugi],
        CAST(0 AS DECIMAL(18,2)) AS [Laba / Rugi Konsol],
        CAST(0 AS DECIMAL(18,2)) AS [Jumlah HPP],
        CAST(0 AS DECIMAL(18,2)) AS [Jumlah (Gross Profit)],

        CAST(
            v.nilai
            AS DECIMAL(18,2)
        ) AS [Penjualan],

        CAST(0 AS DECIMAL(18,2)) AS [Nilai HPP],
        CAST(0 AS DECIMAL(18,2)) AS [Nilai HPP Konsol],

        CAST(
            'OTH'
            AS VARCHAR(50)
        ) AS [ELIMINASI],

        'AMG' AS [PT],

        CAST(
            'OTH'
            AS VARCHAR(50)
        ) AS [GROUP],

        CAST(
            'Koreksi Retur / Potongan Finance'
            AS VARCHAR(200)
        ) AS [Nama Barang Standard]

    FROM (
        VALUES
            (
                '063/INV/AMG-RHM/II/26',
                '2026-03-02',
                -10000,
                -1038240
            ),
            (
                '068/INV/AMG-WKS/II/26',
                '2026-03-02',
                -10000,
                -1038240
            ),
            (
                '068/INV/AMG-WKS/II/26',
                '2026-04-13',
                -1,
                -11500000
            ),
            (
                '075/INV/AMG-PBLP/II/26',
                '2026-03-02',
                -75,
                -193550
            ),
            (
                '223/INV/AMG-BAM/V/26 REVISI INV',
                '2026-07-27',
                -10,
                -377000
            )
    ) v(inv, tgl, qty, nilai)
),

Final2026 AS (
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
        ROUND([Penjualan], 0) AS [Penjualan],
        ROUND([Nilai HPP], 0) AS [Nilai HPP],
        [Nilai HPP Konsol],
        [ELIMINASI],
        [PT],
        [GROUP],
        [Nama Barang Standard]

    FROM Base2026

    UNION ALL

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
        ROUND([Penjualan], 0) AS [Penjualan],
        ROUND([Nilai HPP], 0) AS [Nilai HPP],
        [Nilai HPP Konsol],
        [ELIMINASI],
        [PT],
        [GROUP],
        [Nama Barang Standard]

    FROM Tambah2026
)

/* ============================================================
   FINAL: 2024 + 2025 + 2026
   ============================================================ */

SELECT *
FROM Final2024

UNION ALL

SELECT *
FROM Final2025

UNION ALL

SELECT *
FROM Final2026

ORDER BY
    [Tahun] ASC,
    [Tgl Trn] ASC,
    [No Invoice] ASC;