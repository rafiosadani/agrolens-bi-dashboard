"""
Financial Registry & Benchmark Catalog
Source of Truth for Audited Financial Statements and Intercompany Affiliate Eliminations.
Directly derived from the certified corporate crosscheck dataset:
'crosscheck data - Data Keuangan PT - Per Tahun.csv' and 'crosscheck data - Data Keuangan PT AGC AMG - Per Bulan.csv'
"""

from typing import Dict, Tuple, Optional

# Full Legal Company Names
ENTITY_FULL_NAMES: Dict[str, str] = {
    "AMG": "PT Agrochem Mega Globalindo",
    "ANR": "PT Agrofarm Nusa Raya",
    "API": "PT Agri Prime International",
    "MAA": "PT Mycotech Agro Asia",
    "SAP": "PT Sarana Agro Panata",
    "SBP": "PT Sarana Benih Panata",
    "TTM": "PT Talenta Tiga Muda",
}

# Brand Colors (Agrofarm Ecosystem Palette)
ENTITY_COLORS: Dict[str, str] = {
    "AMG": "#1E3A8A",  # Deep Navy Blue
    "ANR": "#059669",  # Emerald Green
    "API": "#2563EB",  # Royal Blue
    "MAA": "#7C3AED",  # Violet Purple
    "SAP": "#D97706",  # Amber Ochre
    "SBP": "#0D9488",  # Teal Green
    "TTM": "#64748B",  # Slate Gray
}

# Official Audited Financial Targets: (Entity, Year, Segment) -> Nominal (Rupiah)
# Segment: 'all' (Gross Commercial), 'oth' (Third-Party / Non-Affiliate), 'affiliate' (Intercompany)
AUDITED_FINANCIAL_TARGETS: Dict[Tuple[str, int, str], float] = {
    # --- AMG (PT Agrochem Mega Globalindo) ---
    ("AMG", 2024, "all"): 187202479214.00,
    ("AMG", 2024, "oth"): 186966591714.00,
    ("AMG", 2024, "affiliate"): 235887500.00,

    ("AMG", 2025, "all"): 255670314068.00,
    ("AMG", 2025, "oth"): 255631449068.00,
    ("AMG", 2025, "affiliate"): 38865000.00,

    ("AMG", 2026, "all"): 244818802226.00,
    ("AMG", 2026, "oth"): 244746661476.00,
    ("AMG", 2026, "affiliate"): 72140750.00,

    # --- ANR (PT Agrofarm Nusa Raya) ---
    ("ANR", 2024, "all"): 199625865487.00,
    ("ANR", 2024, "oth"): 36140760807.00,
    ("ANR", 2024, "affiliate"): 163485104680.00,

    ("ANR", 2025, "all"): 291321993547.00,
    ("ANR", 2025, "oth"): 104623610304.00,
    ("ANR", 2025, "affiliate"): 186698383243.00,

    ("ANR", 2026, "all"): 343560095837.00,
    ("ANR", 2026, "oth"): 80848415588.00,
    ("ANR", 2026, "affiliate"): 262711680249.00,

    # --- API (PT Agri Prime International) ---
    ("API", 2024, "all"): 17804718704.00,
    ("API", 2024, "oth"): 17714880866.00,
    ("API", 2024, "affiliate"): 89837838.00,

    ("API", 2025, "all"): 56220045475.00,
    ("API", 2025, "oth"): 46248557437.00,
    ("API", 2025, "affiliate"): 9971488038.00,

    ("API", 2026, "all"): 63942168312.00,
    ("API", 2026, "oth"): 63912168312.00,
    ("API", 2026, "affiliate"): 30000000.00,

    # --- MAA (PT Mycotech Agro Asia) ---
    ("MAA", 2024, "all"): 4283239250.00,
    ("MAA", 2024, "oth"): 221171750.00,
    ("MAA", 2024, "affiliate"): 4062067500.00,

    ("MAA", 2025, "all"): 8382934911.00,
    ("MAA", 2025, "oth"): 274581104.00,
    ("MAA", 2025, "affiliate"): 8108353807.00,

    ("MAA", 2026, "all"): 7511306318.00,
    ("MAA", 2026, "oth"): 417370811.00,
    ("MAA", 2026, "affiliate"): 7093935507.00,

    # --- SAP (PT Sarana Agro Panata) ---
    ("SAP", 2024, "all"): 7559980026.00,
    ("SAP", 2024, "oth"): 6709479012.00,
    ("SAP", 2024, "affiliate"): 850501014.00,

    ("SAP", 2025, "all"): 15584095795.00,
    ("SAP", 2025, "oth"): 11815892395.00,
    ("SAP", 2025, "affiliate"): 3768203400.00,

    ("SAP", 2026, "all"): 13722212309.00,
    ("SAP", 2026, "oth"): 10902330959.00,
    ("SAP", 2026, "affiliate"): 2819881350.00,

    # --- SBP (PT Sarana Benih Panata) ---
    ("SBP", 2024, "all"): 834355000.00,
    ("SBP", 2024, "oth"): 834355000.00,
    ("SBP", 2024, "affiliate"): 0.0,

    ("SBP", 2025, "all"): 1233150000.00,
    ("SBP", 2025, "oth"): 1233150000.00,
    ("SBP", 2025, "affiliate"): 0.0,

    ("SBP", 2026, "all"): 66150000.00,
    ("SBP", 2026, "oth"): 66150000.00,
    ("SBP", 2026, "affiliate"): 0.0,

    # --- TTM (PT Talenta Tiga Muda) ---
    ("TTM", 2025, "all"): 2218302500.00,
    ("TTM", 2025, "oth"): 1286238500.00,
    ("TTM", 2025, "affiliate"): 932064000.00,

    ("TTM", 2026, "all"): 1439505500.00,
    ("TTM", 2026, "oth"): 28078000.00,
    ("TTM", 2026, "affiliate"): 1411427500.00,

    # --- KONSOLIDASI (Holding Group / Semua) ---
    ("Semua", 2024, "all"): 417310637681.00,
    ("Semua", 2024, "oth"): 248587239149.00,
    ("Semua", 2024, "affiliate"): 168723398532.00,

    ("Semua", 2025, "all"): 630630836296.00,
    ("Semua", 2025, "oth"): 421113478808.00,
    ("Semua", 2025, "affiliate"): 209517357488.00,

    ("Semua", 2026, "all"): 675060240501.00,
    ("Semua", 2026, "oth"): 400921175145.00,
    ("Semua", 2026, "affiliate"): 274139065356.00,
}

# Audited Affiliate Transactions Breakdown: (SellingEntity, Year) -> { Counterparty: Amount }
AUDITED_AFFILIATE_BREAKDOWN: Dict[Tuple[str, int], Dict[str, float]] = {
    # AMG: 2024 API+SBP, 2025 API only, 2026 API only (ANR excluded from Audited Financials)
    ("AMG", 2024): {"API": 162627500.00, "SBP": 73260000.00},
    ("AMG", 2025): {"API": 38865000.00},
    ("AMG", 2026): {"API": 72140750.00},

    # ANR
    ("ANR", 2024): {"AMG": 150302013250.00, "API": 8383137500.00, "SAP": 4773149750.00, "MAA": 26804180.00},
    ("ANR", 2025): {"AMG": 156375644908.00, "API": 28255718750.00, "SAP": 2054734585.00, "MAA": 12285000.00},
    ("ANR", 2026): {"AMG": 216267204765.00, "API": 38323531250.00, "SAP": 7606034234.00, "MAA": 514910000.00},

    # API
    ("API", 2024): {"ANR": 82000000.00, "AMG": 7837838.00},
    ("API", 2025): {"ANR": 7050634180.00, "AMG": 2920853858.00},
    ("API", 2026): {"AMG": 30000000.00},

    # MAA
    ("MAA", 2024): {"AMG": 2005837500.00, "ANR": 1592965000.00, "API": 463265000.00},
    ("MAA", 2025): {"API": 4048977500.00, "AMG": 3199387500.00, "SAP": 857556375.00, "ANR": 2432432.00},
    ("MAA", 2026): {"AMG": 4137158750.00, "API": 2546998750.00, "ANR": 375117436.00, "SAP": 34660571.00},

    # SAP
    ("SAP", 2024): {"AMG": 836987500.00, "SBP": 13513514.00},
    ("SAP", 2025): {"ANR": 3177754600.00, "AMG": 590448800.00},
    ("SAP", 2026): {"ANR": 2819881350.00},

    # TTM
    ("TTM", 2025): {"ANR": 932064000.00},
    ("TTM", 2026): {"ANR": 1411427500.00},
}


def normalize_entity_code(code: str) -> str:
    """Normalizes UI entity input codes to canonical short codes."""
    if not code:
        return "Semua"
    upper = code.strip().upper()
    if upper in ("AMG", "AGC"):
        return "AMG"
    if upper in ("ANR", "AGF"):
        return "ANR"
    if upper in ("SEMUA", "KONSOLID", "KONSOLIDASI", "ALL"):
        return "Semua"
    return upper


def get_audited_target(entity: str, year: int, segment: str = "all") -> Optional[float]:
    """Retrieves the official audited target value from the registry."""
    norm = normalize_entity_code(entity)
    seg = segment.lower().strip()
    return AUDITED_FINANCIAL_TARGETS.get((norm, year, seg))


def get_affiliate_breakdown(entity: str, year: int) -> Dict[str, float]:
    """
    Returns breakdown of affiliate sales by counterparty.
    If 'Semua' (Consolidated Group), aggregates all internal counterparties.
    """
    norm = normalize_entity_code(entity)
    if norm == "Semua":
        return get_consolidated_affiliate_breakdown(year)
    return AUDITED_AFFILIATE_BREAKDOWN.get((norm, year), {})


def get_consolidated_affiliate_breakdown(year: int) -> Dict[str, float]:
    """Aggregates affiliate sales across all entities for a given year by counterparty."""
    consolidated: Dict[str, float] = {}
    for (ent, yr), sub_map in AUDITED_AFFILIATE_BREAKDOWN.items():
        if yr == year:
            for cp, amt in sub_map.items():
                consolidated[cp] = consolidated.get(cp, 0.0) + amt
    return consolidated

