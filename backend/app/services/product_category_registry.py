"""
Product Category Registry & Mapping Engine for Finance BI Standards.
Maps ERP inventory items to the 9 Audited Product Categories.
Future-proof: Uses embedded dictionary + optional dynamic CSV + rule-based heuristics.
"""

import os
import csv
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger('agrolens.product_category_registry')

# Standardized Audited Categories & Colors
CATEGORY_COLORS: Dict[str, str] = {
    'TRADING': '#2563EB',      # Blue
    'MIKRO': '#059669',        # Emerald
    'HAYATI': '#D97706',       # Amber
    'MAKRO': '#7C3AED',        # Purple
    'PUPUK CAIR': '#0D9488',   # Teal
    'BORON': '#EA580C',        # Orange
    'ORGANIC': '#16A34A',      # Green
    'CuSO4': '#0284C7',        # Sky
    'CRF': '#DB2777',          # Pink
    'LAIN-LAIN': '#64748B',    # Slate
}

CATEGORY_ORDER: Dict[str, int] = {
    'TRADING': 1,
    'MIKRO': 2,
    'HAYATI': 3,
    'MAKRO': 4,
    'PUPUK CAIR': 5,
    'BORON': 6,
    'ORGANIC': 7,
    'CuSO4': 8,
    'CRF': 9,
    'LAIN-LAIN': 10,
}

# Embedded reference dictionary compiled from Finance benchmark CSV (658 items)
EMBEDDED_PRODUCT_CATEGORY_MAP: Dict[str, str] = {
    "activance uv": "TRADING",
    "agil 250 ml": "TRADING",
    "agrimore-k 500 g": "TRADING",
    "agrogibb 1 g": "TRADING",
    "air ro": "TRADING",
    "ally": "TRADING",
    "ally @250gr/btl": "TRADING",
    "ambition 1 l": "TRADING",
    "ambition 500 ml": "TRADING",
    "amblash 1 l": "TRADING",
    "amino acid liquid": "TRADING",
    "amino acid powder": "TRADING",
    "amistartop 250 ml": "TRADING",
    "ammonium chloride": "TRADING",
    "anr 30 (d1)": "MAKRO",
    "anr 30 a (30/8/8)": "MAKRO",
    "anr 30 b (20/16/10)": "MAKRO",
    "anr 30 c (7/17/20)": "MAKRO",
    "antracol": "TRADING",
    "antracol 1 kg": "TRADING",
    "asam sulfat 98%": "TRADING",
    "avidor 100 g": "TRADING",
    "b2o3 29% granul": "BORON",
    "b2o3 46%": "BORON",
    "bactocyn 100 ml": "TRADING",
    "bactocyn 200 ml": "TRADING",
    "bahan pertanian": "TRADING",
    "barruchem kumatetralil (waxblock)": "TRADING",
    "baru chem 0,75%": "TRADING",
    "baru chem 3,75%": "TRADING",
    "bass-nil 1 kg": "TRADING",
    "bass-nil 500 g": "TRADING",
    "bayfolan 500 ml": "TRADING",
    "benefit 1 kg": "TRADING",
    "benefit 500g": "TRADING",
    "benih buncis tewe (bca) 500 g": "TRADING",
    "benih cabai besar columbus 10gr - biji cabe merah besar hibrida f1 original 100%": "TRADING",
    "benih cabai besar darmais f1 10 g": "TRADING",
    "benih cabai rawit cakra hijau 10gr - bibit biji cabe chia tai seed cap kapal terbang original kemasan pabrik": "TRADING",
    "benih calopogonium (kacangan cm)": "TRADING",
    "benih jagung adv jago 1 kg": "TRADING",
    "benih jagung bisi": "TRADING",
    "benih jagung dk 771 1 kg": "TRADING",
    "benih jagung hibrida nk6172 perkasa 1kg bibit jagung unggul original kemasan pabrik": "TRADING",
    "benih jagung nk212": "TRADING",
    "benih kacang panjang borneo tavi 500 g": "TRADING",
    "benih kacang panjang semeru 500 g": "TRADING",
    "benih melon merlin f1 20 g": "TRADING",
    "benih mucuna bracteata": "TRADING",
    "benih mucuna bracteate (mb) india": "TRADING",
    "benih mucuna bracteate (mb) lokal": "TRADING",
    "benih padi bimo ciherang 5 kg": "TRADING",
    "benih padi ciherang": "TRADING",
    "benih padi m410 5 kg": "TRADING",
    "benih padi m70d 5 kg": "TRADING",
    "benih padi malaka ciherang 5 kg": "TRADING",
    "benih padi malaka inpari 16 5 kg": "TRADING",
    "benih padi malaka inpari 32 5 kg": "TRADING",
    "benih padi malaka sunggal 5 kg": "TRADING",
    "benih pueraria (kacangan pj)": "TRADING",
    "benih semangka inden f1 20 g": "TRADING",
    "benih semangka madrid f1 20 g": "TRADING",
    "benih terong kenari 10 g": "TRADING",
    "benih terong ungu prince 07 - 10gr terong ungu hibrida f1 original dalam masa edar": "TRADING",
    "benih timun semi f1 20 g": "TRADING",
    "beras menir": "TRADING",
    "bibit sawit": "TRADING",
    "bio sigma/tricodherma 1 kg": "HAYATI",
    "bio sigma/tricodherma 500 gram": "HAYATI",
    "bioneensis": "TRADING",
    "biosilac padat": "TRADING",
    "biostab": "TRADING",
    "borate 46%": "BORON",
    "borate 56% inabor (boric acid)": "BORON",
    "borate pentahydrate 46%": "BORON",
    "borate pentahydrate 48%": "BORON",
    "borax pentahydrate 48%": "BORON",
    "boric acid": "BORON",
    "boric acid 56%": "BORON",
    "boril": "BORON",
    "boril 1 ltr": "PUPUK CAIR",
    "boril 1l": "PUPUK CAIR",
    "boril 250 ml": "PUPUK CAIR",
    "boril 250ml": "PUPUK CAIR",
    "boril 500ml": "PUPUK CAIR",
    "boril kemasan 250 ml": "BORON",
    "boril plus": "PUPUK CAIR",
    "broad plus 40 g": "TRADING",
    "brodifacoum": "TRADING",
    "brodifakum (sime ebor 2030)": "TRADING",
    "brofreya 100 ml": "TRADING",
    "brofreya 200 ml": "TRADING",
    "brofreya 50 ml": "TRADING",
    "brofreya red 100 ml": "TRADING",
    "brofreya red 200 ml": "TRADING",
    "cabrio 200 ml": "TRADING",
    "cabrio 250 ml": "TRADING",
    "calcium carbonate 100 mesh": "TRADING",
    "calcium carbonate 400 mesh": "TRADING",
    "calgeron 1kg": "TRADING",
    "captive 100 ml": "TRADING",
    "captive 500 ml": "TRADING",
    "cash flow insektisida 100 ml": "TRADING",
    "cash flow insektisida 250 ml": "TRADING",
    "caustic soda flake": "TRADING",
    "chelated fe lignosulfonate 15%": "MIKRO",
    "chelated zincop +b 4/8/20": "MIKRO",
    "chelated zincop +b 6/10/18": "MIKRO",
    "chelated zincopbor 6/8/20": "MIKRO",
    "chelated zincoper+ b  6/10/20": "MIKRO",
    "chelated zincopper + b 10/8/16": "MIKRO",
    "chelated zincopper 4/8": "MIKRO",
    "chelated zincopper+boron 8/8/18": "MIKRO",
    "chloramine green -r": "TRADING",
    "chloramine red -r": "TRADING",
    "chlorpastrin 1 l": "TRADING",
    "chlorpastrin 100 ml": "TRADING",
    "chlorpastrin 250 ml": "TRADING",
    "chlorpastrin 400 ml": "TRADING",
    "clincher 200 ml": "TRADING",
    "clipper 250ml": "TRADING",
    "copper oxide ew (fg)": "TRADING",
    "copper sulfat 18%": "CuSO4",
    "copper sulfat 22%": "CuSO4",
    "copper sulfat 24,5 % anr": "CuSO4",
    "copper sulfat 24.5%": "CuSO4",
    "copper sulfate 18%": "CuSO4",
    "copper sulfate 22%": "CuSO4",
    "copper sulfate 24%": "CuSO4",
    "copper sulfate pentahydrate 25 kg": "CuSO4",
    "copper sulphate 23%": "CuSO4",
    "copper sulphate 24,5% (fg)": "CuSO4",
    "copperzinc 15/10": "MIKRO",
    "crf 12,5-6-27-2": "CRF",
    "crf 20/7/10": "CRF",
    "crf anr 10-40-10+3mgo": "CRF",
    "crf anr 10/40/10+3mgo": "CRF",
    "crf anr 20-7-10+3mgo": "CRF",
    "cruiser 12,5 ml": "TRADING",
    "cu concentrate 12% up 1 kg": "TRADING",
    "cufe 12/10": "MIKRO",
    "cufeb 9,2/6/18 lakaba": "MIKRO",
    "cuo roasting 30% (fg)": "TRADING",
    "cuo roasting 40% (fg)": "TRADING",
    "cuo roasting 45% (fg)": "TRADING",
    "cuo roasting 50% (fg)": "TRADING",
    "cuo roasting 55% (fg)": "TRADING",
    "curacron 500 ml": "TRADING",
    "cuso4": "CuSO4",
    "dap 16-45": "TRADING",
    "dap granule": "TRADING",
    "dithane 1 kg": "TRADING",
    "dodos": "TRADING",
    "dolomit": "TRADING",
    "dolomite": "TRADING",
    "draxone 20 lt": "TRADING",
    "egrek merk  sam lee": "TRADING",
    "egrek panjang": "TRADING",
    "egrek standard": "TRADING",
    "em 4": "TRADING",
    "enzyme biomee": "TRADING",
    "eros gold 250 ml": "TRADING",
    "exotic 1 l": "TRADING",
    "exotic 500 l": "TRADING",
    "fe 15% lakaba": "MIKRO",
    "fe 15% lkb": "MIKRO",
    "fe lignosulfonat - 15%": "MIKRO",
    "fe lignosulfonat 15% lakaba": "MIKRO",
    "fe lignosulfonat 25% lakaba": "MIKRO",
    "fe monohydrate (fg)": "TRADING",
    "feromon": "TRADING",
    "feromonas": "TRADING",
    "ferro sulfate heptahydrate 25 kg": "TRADING",
    "ferro sulphate": "TRADING",
    "ferro sulphate monohydrate powder": "TRADING",
    "ferrous sulfate monohydrate 30%": "TRADING",
    "ferrous sulphate heptahydrate": "TRADING",
    "ferrous sulphate heptahydrate (feso4)": "TRADING",
    "ferrous sulphate monohydrate": "TRADING",
    "feso4": "TRADING",
    "filia": "TRADING",
    "flashoot 100 ml": "TRADING",
    "fortune 4000 mesh 1 kg": "TRADING",
    "fosmag": "TRADING",
    "fungisida dhitane m-45 80wp corteva original kemasan pabrik - 500gr": "TRADING",
    "furadan 1 kg": "TRADING",
    "gabah": "TRADING",
    "gagang dodos": "TRADING",
    "gandasil d 500 gr": "TRADING",
    "gempur 1 l": "TRADING",
    "glitter 10 g": "TRADING",
    "glitter 50 g": "TRADING",
    "gol stick 0,5 l": "TRADING",
    "gol stick 1 l": "TRADING",
    "gol stick 2 l": "TRADING",
    "gramoxone": "TRADING",
    "gramoxone 1 l": "TRADING",
    "gramoxone 20 ltr": "TRADING",
    "gramoxone 250 ml": "TRADING",
    "gramoxone 500 ml": "TRADING",
    "greemi - g": "TRADING",
    "gromino": "PUPUK CAIR",
    "gromino  yield enhancer - 500 ml": "PUPUK CAIR",
    "gromino 1 liter": "PUPUK CAIR",
    "gromino 1l": "PUPUK CAIR",
    "gromino 500 ml": "PUPUK CAIR",
    "gromino 500ml": "PUPUK CAIR",
    "gromino growth promoter": "PUPUK CAIR",
    "gromino growth promoter 1 liter": "PUPUK CAIR",
    "gromino yield enhancer - 1 liter": "PUPUK CAIR",
    "gromino yield enhancer - 500ml": "PUPUK CAIR",
    "ground colimanite": "TRADING",
    "hayme": "TRADING",
    "hcl": "TRADING",
    "herbisida glifosat": "TRADING",
    "herbisida glisofat": "TRADING",
    "herbisida gramoxone 276sl racun rumput dan gulma - 500ml": "TRADING",
    "herbisida methyl metsulsuron": "TRADING",
    "herbisida metil metsulsuron": "TRADING",
    "hgfb boron borate": "TRADING",
    "hgfb ex usa/ turkey (borate)": "BORON",
    "hidromix": "TRADING",
    "hidromix 260 gr": "TRADING",
    "hobsanol 100 ml": "TRADING",
    "humacoat": "ORGANIC",
    "humic acid": "ORGANIC",
    "humic acid @1kg": "ORGANIC",
    "humic acid 70% (fg)": "ORGANIC",
    "humigrow": "ORGANIC",
    "humigrow 1 kg": "ORGANIC",
    "humigrow 25 kg": "ORGANIC",
    "humigrow 500 g": "ORGANIC",
    "humigrow 500 gram": "ORGANIC",
    "hummer 1 kg": "ORGANIC",
    "hummer 500 gram": "ORGANIC",
    "hydroboracite ft": "TRADING",
    "inabor 10": "BORON",
    "inabor 10 (ba)": "BORON",
    "inabor 10 (calsium borate)": "BORON",
    "inabor 10 (micromate borate)": "BORON",
    "inabor 10 @1kg": "BORON",
    "inabor 10 @25kg": "BORON",
    "inabor 1kg": "BORON",
    "incipio 100 ml": "TRADING",
    "inner (52 x 80) 50 micron (fg)": "TRADING",
    "inner (55 x 90) 50 micron": "TRADING",
    "inner (55 x 90) 60 micron": "TRADING",
    "inner (60 x 105) 50 micron (fg)": "TRADING",
    "inner sak mycogrow": "TRADING",
    "insektisida decis 25ec 500ml - pembasmi hama ulat belalang pada tanaman": "TRADING",
    "insektisida hama larva": "TRADING",
    "insektisida petrofur": "TRADING",
    "insektisida regent 50sc 50ml pembasmi hama + zpt": "TRADING",
    "insektisida spontan 400sl 1 liter obat pembasmi hama tanaman": "TRADING",
    "insure max 25 ml": "TRADING",
    "iron oxide green": "TRADING",
    "jagung": "TRADING",
    "jagung nk perkasa 6172 - 1 kg": "TRADING",
    "jasa maklon": "TRADING",
    "jasa repcak": "TRADING",
    "kabel ties": "TRADING",
    "kabel ties 3,6 x 150 mm": "TRADING",
    "kacangan cm": "TRADING",
    "kacangan mb (macuna bracteata)": "TRADING",
    "kacangan pj": "TRADING",
    "kairomix": "TRADING",
    "kalium humat (sniper soil)": "ORGANIC",
    "kangkung bisi repack 50 gr": "TRADING",
    "kardus inabor": "TRADING",
    "kardus mycogrow": "TRADING",
    "kardus/box tricoba": "TRADING",
    "karung 75x115": "TRADING",
    "karung ukr 75 cm x 115 cm": "TRADING",
    "karung ukr 75 cm x 116 cm": "TRADING",
    "kayabas 250 ml": "TRADING",
    "kcl": "TRADING",
    "kcl pak tani": "TRADING",
    "kelonil 500 gr": "TRADING",
    "kieserite": "TRADING",
    "kiesirite": "TRADING",
    "klem egrek": "TRADING",
    "klem sambungan pipa": "TRADING",
    "kno3 pak tani merah 2 kg": "TRADING",
    "kompos": "TRADING",
    "kuproxat 500 ml": "TRADING",
    "lakaba 5kg": "MIKRO",
    "lalang": "TRADING",
    "lalang up @20 ltr": "TRADING",
    "larvin": "TRADING",
    "larvin 15 gr": "TRADING",
    "ligno ca (fg)": "TRADING",
    "ligno ga": "TRADING",
    "macam-macam produk": "TRADING",
    "magnesium sulphate heptahydrate": "TRADING",
    "magnesium sulphate heptahydrate 99,5%": "TRADING",
    "mamigro": "TRADING",
    "mamigro 30 gr": "TRADING",
    "mamigro n 500 gr": "TRADING",
    "management fee": "TRADING",
    "management fee (januari -juni 2023)": "TRADING",
    "management fee (juli-september 2023)": "TRADING",
    "management fee (oktober - desember 2023)": "TRADING",
    "manmop 800 g": "TRADING",
    "manzil biru 1 kg": "TRADING",
    "manzil kuning 1 kg": "TRADING",
    "mao wang": "TRADING",
    "map 1kg": "TRADING",
    "marshal ds 25 g": "TRADING",
    "marshal sc 500 ml": "TRADING",
    "matador": "TRADING",
    "maxiphos 1 l": "TRADING",
    "maxiphos 250ml": "TRADING",
    "maxiphos 500ml": "TRADING",
    "metaribb": "TRADING",
    "metarizium": "TRADING",
    "meurtieur 100 ml": "TRADING",
    "meurtieur 250 ml": "TRADING",
    "mgo 60% (fg)": "TRADING",
    "mgo 85%": "TRADING",
    "micobio kemasan 1kg": "HAYATI",
    "microplex edta": "MIKRO",
    "mikoriza": "HAYATI",
    "minogen 1l (mmt)": "PUPUK CAIR",
    "minogen 500ml": "HAYATI",
    "minogen 500ml (mmt)": "PUPUK CAIR",
    "mipcin 50 wp 500 gr": "TRADING",
    "mixing zncu 10/5 (fg)": "MIKRO",
    "mixing zncu 20/5": "MIKRO",
    "mixing zncu 30/30": "MIKRO",
    "mixing zncu 35/5 (fg)": "MIKRO",
    "mixing zncu 40/5": "MIKRO",
    "mixing zncu 42/7": "MIKRO",
    "mixing zncu 45/5 (fg)": "MIKRO",
    "mixing zncu 48/23 (fg)": "MIKRO",
    "mixing zncu 50/5": "MIKRO",
    "miza plus": "TRADING",
    "mkp 1kg": "TRADING",
    "mkp pak tani 1 kg": "TRADING",
    "mop": "TRADING",
    "mop (kalium 60%)": "TRADING",
    "mop/kcl": "TRADING",
    "moriox 100 ml": "TRADING",
    "mycogrow": "HAYATI",
    "mycogrow @ 25 kg": "HAYATI",
    "mycogrow @1kg": "HAYATI",
    "mycogrow @25kg": "HAYATI",
    "mycogrow 1 kg": "HAYATI",
    "mycogrow 1kg": "HAYATI",
    "mycogrow 25 kg": "HAYATI",
    "mycogrow 25kg": "HAYATI",
    "mycogrow 25kg pupuk hayati mikoriza pupuk organik original 100%": "HAYATI",
    "mycogrow kemasan 1 kg": "HAYATI",
    "mycogrow powder": "HAYATI",
    "mycogrow powder 50 gr": "HAYATI",
    "mycogrow pupuk organik hayati mikoriza 1 kg": "HAYATI",
    "mycogrow sampel": "HAYATI",
    "mycogrow/mikoriza": "HAYATI",
    "mycogrow/mikoriza/mycopalm": "HAYATI",
    "mycopalm": "HAYATI",
    "nativo": "TRADING",
    "nativo 12,5 gr": "TRADING",
    "nativo50": "TRADING",
    "nebijin 2 kg": "TRADING",
    "nebijin 5 kg": "TRADING",
    "neoxone 1 l": "TRADING",
    "netpot": "TRADING",
    "netralin": "TRADING",
    "nifurone 3.5 gr": "TRADING",
    "nissozin 200 g": "TRADING",
    "nitralite 25 kg": "TRADING",
    "nitrea prill": "TRADING",
    "nordox": "TRADING",
    "nordox 56wp kemasan 500gr - fungisida bakterisida alami asli nordox as norwegia": "TRADING",
    "novlect 500 ml": "TRADING",
    "noxone": "TRADING",
    "noxone 1 l": "TRADING",
    "npk (30/8/8)": "MAKRO",
    "npk 10/10/10": "MAKRO",
    "npk 12-12-17-2+te": "MAKRO",
    "npk 12/12/17/2": "MAKRO",
    "npk 13/6/27/4": "MAKRO",
    "npk 13/6/27/4/b": "MAKRO",
    "npk 13/6/27/4/b +0,65b": "MAKRO",
    "npk 15/15/6/4": "MAKRO",
    "npk 16/16/16": "MAKRO",
    "npk 17/17/17": "MAKRO",
    "npk 20/16/10": "TRADING",
    "npk 20/7/10+3mgo": "TRADING",
    "npk 27/10/7": "MAKRO",
    "npk 30/8/8": "MAKRO",
    "npk 7/17/20": "TRADING",
    "npk 8/15/16": "MAKRO",
    "npk crf 12,5/6/27/2": "CRF",
    "npk crf 8/15/16": "CRF",
    "npk yaramila faster 25-7-7 50 kg": "TRADING",
    "npk yaramila winner 15-09-20 50 kg": "TRADING",
    "npk yaramilla 16.16.16": "TRADING",
    "npk zeo green spesial padi 1 l": "TRADING",
    "npk zeo green spesial tembakau 1 l": "TRADING",
    "npk zeogreen 0,5 l": "TRADING",
    "npk zeogreen 1 l": "TRADING",
    "npk zeogreen 5 l": "TRADING",
    "orgadec": "TRADING",
    "orical 1kg": "TRADING",
    "oricmas": "TRADING",
    "ormona": "PUPUK CAIR",
    "ormona 1 l": "PUPUK CAIR",
    "ormona 1l": "PUPUK CAIR",
    "ormona kemasan 1 l": "PUPUK CAIR",
    "oxy zincopper 10/15/6s mas": "MIKRO",
    "pac industri": "TRADING",
    "padi": "TRADING",
    "palmchar": "HAYATI",
    "palmchar/tricoba/tricodherma": "HAYATI",
    "palmic 3/6/6": "MIKRO",
    "palmic 6/6/20": "MIKRO",
    "palmic 8/8/8": "MIKRO",
    "penjualan langsung": "TRADING",
    "penjualan tunai": "TRADING",
    "penta smart 1 l": "TRADING",
    "penta smart 20 l": "TRADING",
    "pipa egrek dalam": "TRADING",
    "pipa egrek luar": "TRADING",
    "pipa gold samlee panjang 12 m": "TRADING",
    "plenum 25 g": "TRADING",
    "polimer cationic": "TRADING",
    "pollen": "TRADING",
    "polybag": "TRADING",
    "polybag mn pembibitan": "TRADING",
    "prevathon 100 ml": "TRADING",
    "prevathon 250 ml": "TRADING",
    "preza 250 ml": "TRADING",
    "proclaim 25 gr": "TRADING",
    "pupuk bionensis": "TRADING",
    "pupuk borate": "BORON",
    "pupuk chelated zincobor 8/8/8": "MIKRO",
    "pupuk chelated zincopper 10/15": "MIKRO",
    "pupuk chelated zincufe 4/12/8": "MIKRO",
    "pupuk cirp": "TRADING",
    "pupuk czb 8/12/11": "MIKRO",
    "pupuk kaptan": "TRADING",
    "pupuk kristal ultradap pak tani kemasan pabrik 1kg nitrogen phosphate (re-pack 250gr)": "TRADING",
    "pupuk mikoriza": "HAYATI",
    "pupuk mikro lakaba 8/8/8 (zn/cu/b2o3) - 25 kg mikro nutrisi sawit": "MIKRO",
    "pupuk mop": "TRADING",
    "pupuk mpk pak tani 1kg mono potassium phosphate asli kemasan pabrik": "TRADING",
    "pupuk mycogrow serbuk": "HAYATI",
    "pupuk nitralite 25kg": "TRADING",
    "pupuk npk": "MAKRO",
    "pupuk npk 15.15.6.4": "MAKRO",
    "pupuk npk pak tani 16-16-16 biru origin rusia kemasan pabrik 1kg": "MAKRO",
    "pupuk organic": "ORGANIC",
    "pupuk organik (tricoderma, mycogrow )": "HAYATI",
    "pupuk organik hayati mikoriza mycogrow 1kg untuk tanaman hias, horti": "HAYATI",
    "pupuk palmic 8/8/8": "MIKRO",
    "pupuk rock phosphate": "TRADING",
    "pupuk rp (rock phospate)": "TRADING",
    "pupuk tricoba": "HAYATI",
    "pupuk tsp": "TRADING",
    "pupuk tsp pabrik": "TRADING",
    "pupuk urea non subsidi": "TRADING",
    "pupuk za": "TRADING",
    "pupuk zk": "TRADING",
    "pupuk znso4": "TRADING",
    "purple red 3772": "TRADING",
    "qiucall (pupuk calsium)": "TRADING",
    "qiutrico 500 gram": "TRADING",
    "racun tikus": "TRADING",
    "ralang 1l": "TRADING",
    "regent 0,3 gr 1 kg": "TRADING",
    "regent 100 ml": "TRADING",
    "regent 250 ml": "TRADING",
    "regent 50sc 250ml insektisida + zpt obat pengendali hama tanaman": "TRADING",
    "regent biru 50sc 500ml": "TRADING",
    "remazole (p) 250 ml x 40": "TRADING",
    "rhinomas": "TRADING",
    "rhodamine": "TRADING",
    "rock phosphate": "TRADING",
    "rockwool": "TRADING",
    "roundup 1 l": "TRADING",
    "roundup 1l": "TRADING",
    "roundup 200 ml": "TRADING",
    "sagri beat 200g": "TRADING",
    "sagri beat 80g": "TRADING",
    "sak fg anr 30 (a1)": "TRADING",
    "sak fg anr 30 (b1)": "TRADING",
    "sak fg anr 30 (c1)": "TRADING",
    "sak fg anr 30 (d1)": "TRADING",
    "sak fg anr 30 (e1)": "TRADING",
    "sak fg inabor 10": "TRADING",
    "sak polos (52 x 95)": "TRADING",
    "sak polos @25kg": "TRADING",
    "sak polos @50 kg (fg)": "TRADING",
    "saminotop 1 l": "TRADING",
    "saminotop 500 ml": "TRADING",
    "sankill 250 ml": "TRADING",
    "sarf plantsafe": "TRADING",
    "satya hot 1 l": "TRADING",
    "satya hot 20 l": "TRADING",
    "score 250ec - 250ml fungisida sistemik pengendali penyakit jamur tanaman": "TRADING",
    "score 250ec - 80ml fungisida sistemik original syngenta obat penyakit jamur tanaman": "TRADING",
    "selang kansui": "TRADING",
    "sevin 100 g": "TRADING",
    "sewa combine": "TRADING",
    "sewa light truck toyota": "TRADING",
    "sewa mitsubishi truck": "TRADING",
    "sigplus": "TRADING",
    "sigplus @20 liter": "TRADING",
    "silvestrin 1 l": "TRADING",
    "silvestrin 100ml": "TRADING",
    "silvestrin 500 ml": "TRADING",
    "sime ebor baits": "TRADING",
    "sime ebor baits (wafarin)": "TRADING",
    "sime rb pheromone": "TRADING",
    "small pack chili horoson": "TRADING",
    "small pack terong ratih hijau": "TRADING",
    "sodium borate": "BORON",
    "sodium humate": "ORGANIC",
    "spontan 1 l": "TRADING",
    "spontan 200 ml": "TRADING",
    "spontan 500 ml": "TRADING",
    "spontan king 1l": "TRADING",
    "spontan king 500 ml": "TRADING",
    "sprayer jetspray 1 l": "TRADING",
    "starane @500ml": "TRADING",
    "starane 290 ec 500 ml": "TRADING",
    "staras 250 ml": "TRADING",
    "starban 100 ml": "TRADING",
    "starban 400ml": "TRADING",
    "sulfur powder (belerang lokal)": "TRADING",
    "sulfur powder (fg)": "TRADING",
    "sumo 250 ml": "TRADING",
    "sumo 50ec - 250ml insektisida ampuh basmi hama ulat kutu cabuk pada tanaman": "TRADING",
    "talcum powder": "TRADING",
    "tangki kocor": "TRADING",
    "tawas (aluminium sulfate)": "TRADING",
    "tawas (aluminium sulphate)": "TRADING",
    "tcca powder": "TRADING",
    "teballo 250 ml": "TRADING",
    "tembaga ts": "TRADING",
    "tembaga ts 98% 1 kg": "TRADING",
    "termikon 100 ml": "TRADING",
    "termikon 400 ml": "TRADING",
    "tetes tebu": "TRADING",
    "titanium dioxide anatase": "TRADING",
    "topshot 60 dd 250 ml": "TRADING",
    "topshot 60 dd 500 ml": "TRADING",
    "tray semai benih": "TRADING",
    "tricoba": "HAYATI",
    "tricoba 25 kg": "HAYATI",
    "tricoba 500 g": "HAYATI",
    "tricoba 500 gram": "HAYATI",
    "tricoba kemasan 500 gr": "HAYATI",
    "tricoderma": "HAYATI",
    "tricoderma/ palmchar": "HAYATI",
    "turquise blue": "TRADING",
    "ulexite calcinada": "TRADING",
    "ultradap": "TRADING",
    "urea": "TRADING",
    "urea non subsidi": "TRADING",
    "urea petro 5 kg": "TRADING",
    "urea/nitrea": "TRADING",
    "velum 250 ml": "TRADING",
    "virtako 300sc 10 ml": "TRADING",
    "vitamin b1": "TRADING",
    "warfarin": "TRADING",
    "wed solution": "TRADING",
    "weed solut-ion @ 20 ltr": "TRADING",
    "welldan 100 ml": "TRADING",
    "white oil": "TRADING",
    "wood pellet": "TRADING",
    "yaramilla faster": "TRADING",
    "yaramilla winner": "TRADING",
    "yoozeb 82 wp 500 gr": "TRADING",
    "za": "TRADING",
    "za petro repack 5 kg": "TRADING",
    "zeolit powder": "TRADING",
    "zinc granule": "MIKRO",
    "zinc oxide 50-55% (fg)": "TRADING",
    "zinc oxide 60% up": "TRADING",
    "zinc oxide 60% up 1 kg": "TRADING",
    "zinc oxide 70% (fg)": "TRADING",
    "zinc oxide granule": "MIKRO",
    "zn 40-44 (fg)": "MIKRO",
    "zn 45-49 (fg)": "MIKRO",
    "znb 10/10 lakaba": "MIKRO",
    "zncu 10/15 azelis": "MIKRO",
    "zncu 10/15 lakaba": "MIKRO",
    "zncu 10/15 lakaba (m)": "MIKRO",
    "zncu 10/15 lakaba (p)": "MIKRO",
    "zncu 10/15 mas": "MIKRO",
    "zncu 10/15 micba": "MIKRO",
    "zncu 10/15 palmic": "MIKRO",
    "zncu 4/8 lakaba": "MIKRO",
    "zncu 4/8 micba": "MIKRO",
    "zncu 4/8 palmic": "BORON",
    "zncu 8/8 mas": "MIKRO",
    "zncu edta 7,8/7,8 mas": "MIKRO",
    "zncub 10/10/10 lakaba": "BORON",
    "zncub 10/6/3": "BORON",
    "zncub 10/8/16 lakaba": "BORON",
    "zncub 3/6/6": "BORON",
    "zncub 3/6/6 lakaba": "BORON",
    "zncub 3/6/6 mas": "BORON",
    "zncub 3/6/6 palmic": "BORON",
    "zncub 3/8/8 mas": "BORON",
    "zncub 4/6/6 lakaba": "BORON",
    "zncub 6/10/20 lakaba": "BORON",
    "zncub 6/10/20 lakaba (m)": "BORON",
    "zncub 6/3/6": "BORON",
    "zncub 6/6/20 palmic": "BORON",
    "zncub 6/8/20 lakaba": "BORON",
    "zncub 6/8/20 lakaba (p)": "BORON",
    "zncub 6/8/20 palmic": "BORON",
    "zncub 6/8/8": "BORON",
    "zncub 6/8/8 lakaba": "BORON",
    "zncub 7,5/11/2": "BORON",
    "zncub 8/12/11 lakaba": "BORON",
    "zncub 8/12/11 micba": "BORON",
    "zncub 8/12/11 palmic": "BORON",
    "zncub 8/12/3,5": "BORON",
    "zncub 8/12/3.5 mas": "BORON",
    "zncub 8/12/4": "BORON",
    "zncub 8/12/4 lakaba": "BORON",
    "zncub 8/12/4 mas": "BORON",
    "zncub 8/8/20 lakaba": "BORON",
    "zncub 8/8/6": "BORON",
    "zncub 8/8/8 @1kg": "BORON",
    "zncub 8/8/8 lakaba": "BORON",
    "zncub 8/8/8 lakaba (p)": "BORON",
    "zncub 8/8/8 lkb": "BORON",
    "zncub 8/8/8 mas": "BORON",
    "zncub 8/8/8 palmic": "BORON",
    "zncub 8/8/8 palmic (m)": "BORON",
    "zncub 9/11/13 lakaba": "BORON",
    "zncubs 8/12/4/6 mas": "BORON",
    "zncufe 4/12/8 lakaba": "MIKRO",
    "zncufe 4/12/8 lakaba (m)": "MIKRO",
    "zncufe 4/12/8 lkb": "MIKRO",
    "zncufe 4/12/8 micba": "MIKRO",
    "zncufe 4/12/8 micba (p)": "MIKRO",
    "zncufe 4/12/8 palmic": "MIKRO",
    "zncufe 8/10/8 lakaba": "MIKRO",
    "zncufe 8/12/8 palmic": "MIKRO",
    "zncufeb 6/3/10/8": "MIKRO",
    "zncufeb 6/3/10/8 lakaba": "MIKRO",
    "zncufeb 6/3/22/10": "MIKRO",
    "zncufeb 6/4/11/2": "MIKRO",
    "zncus 10/15/6 lakaba": "MIKRO",
    "zncus 10/15/6 mas": "MIKRO",
    "zncus 10/15/6 micba": "MIKRO",
    "zncus 10/15/6 palmic": "MIKRO",
    "zno cuo 10/15": "MIKRO",
    "znso4": "TRADING",
    "znso4 0.36 alfagreen 1 kg": "TRADING",
    "znso4 12%": "TRADING",
    "znso4 21%": "TRADING",
    "znso4 mono": "TRADING"
}

# Runtime caches (dynamically initialized with V2 mapping and embedded fallback)
_RUNTIME_NAME_MAP: Dict[str, str] = {}
_RUNTIME_COMBO_MAP: Dict[Tuple[str, str], str] = {}
_RUNTIME_SKU_MAP: Dict[str, str] = {}


def _init_registry() -> Tuple[Dict[Tuple[str, str], str], Dict[str, str], Dict[str, str]]:
    """Initializes runtime dictionaries from V2 crosscheck dataset and embedded constants."""
    global _RUNTIME_NAME_MAP, _RUNTIME_COMBO_MAP, _RUNTIME_SKU_MAP

    if _RUNTIME_NAME_MAP and (_RUNTIME_COMBO_MAP or _RUNTIME_SKU_MAP):
        return _RUNTIME_COMBO_MAP, _RUNTIME_SKU_MAP, _RUNTIME_NAME_MAP

    _RUNTIME_NAME_MAP = dict(EMBEDDED_PRODUCT_CATEGORY_MAP)
    _RUNTIME_COMBO_MAP = {}
    _RUNTIME_SKU_MAP = {}

    csv_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'crosscheck_data_produk_jenis_v2_pivot.csv'),
        './backend/data/crosscheck_data_produk_jenis_v2_pivot.csv',
        os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'product_category_mapping.csv'),
        './backend/data/product_category_mapping.csv',
    ]

    for p in csv_paths:
        if os.path.isfile(p):
            try:
                with open(p, mode='r', encoding='utf-8-sig') as f:
                    reader = csv.reader(f)
                    next(reader, None)
                    for r in reader:
                        # V2 schema: col 3 = Nama, col 4 = Produk, col 5 = Kode
                        if len(r) >= 5 and r[3].strip() and r[3].strip().lower() != 'grand total':
                            nama = r[3].strip()
                            cat = r[4].strip()
                            kode = r[5].strip() if len(r) >= 6 else ''

                            norm_n = ' '.join(nama.lower().split())
                            norm_k = kode.strip().upper()

                            # Hierarchy priority: specialized chemical categories take precedence over general buckets
                            CAT_PRIORITY = {
                                'BORON': 10, 'CUSO4': 10, 'CRF': 10, 'HAYATI': 9,
                                'PUPUK CAIR': 9, 'ORGANIC': 9, 'MAKRO': 8, 'MIKRO': 5, 'TRADING': 1
                            }
                            new_p = CAT_PRIORITY.get(cat.upper(), 5)

                            if norm_k:
                                cur_combo = _RUNTIME_COMBO_MAP.get((norm_n, norm_k), "")
                                if not cur_combo or new_p >= CAT_PRIORITY.get(cur_combo.upper(), 0):
                                    _RUNTIME_COMBO_MAP[(norm_n, norm_k)] = cat

                                cur_sku = _RUNTIME_SKU_MAP.get(norm_k, "")
                                if not cur_sku or new_p >= CAT_PRIORITY.get(cur_sku.upper(), 0):
                                    _RUNTIME_SKU_MAP[norm_k] = cat

                            cur_name = _RUNTIME_NAME_MAP.get(norm_n, "")
                            if not cur_name or new_p >= CAT_PRIORITY.get(cur_name.upper(), 0):
                                _RUNTIME_NAME_MAP[norm_n] = cat

                        # V1 schema fallback: col 0 = Nama, col 1 = Produk
                        elif len(r) >= 2 and r[0].strip() and r[0].strip().lower() != 'grand total':
                            norm_v1 = ' '.join(r[0].strip().lower().split())
                            if norm_v1 not in _RUNTIME_NAME_MAP:
                                _RUNTIME_NAME_MAP[norm_v1] = r[1].strip()

                logger.debug(f'Loaded dynamic category mappings from {p}')
                break
            except Exception as e:
                logger.warning(f'Could not load {p}: {e}')

    return _RUNTIME_COMBO_MAP, _RUNTIME_SKU_MAP, _RUNTIME_NAME_MAP


def infer_fallback_category(item_name: str, item_code: Optional[str] = None) -> str:
    """
    Rule-based heuristic classifier for new or unregistered items (future-proof 2027+).
    """
    name_upper = (item_name or '').upper()
    code_upper = (item_code or '').upper()

    # 1. BORON (High specificity: Inabor, Borate, Borax, Boric, B2O3, ZnCuB, HGFB, Boril)
    if any(k in name_upper for k in ['BORON', 'INABOR', 'BORATE', 'BORIC', 'BORAX', 'B2O3', 'BORIL', 'ZNCUB', 'ZNCU 10', 'ZNCU 4', 'HGFB']):
        return 'BORON'

    # 2. CuSO4
    if any(k in name_upper for k in ['CUSO4', 'COPPER SULFAT', 'COPPER SULFATE', 'COPPER SULPHATE']):
        return 'CuSO4'

    # 3. CRF
    if 'CRF' in name_upper:
        return 'CRF'

    # 4. HAYATI
    if any(k in name_upper for k in ['MYCOGROW', 'TRICOBA', 'TRICODERMA', 'TRICHODERMA', 'PALMCHAR', 'MIKORIZA', 'MICOBIO', 'BIO SIGMA', 'HAYATI', 'BACTO', 'BACILLUS', 'BIOLOGIS']):
        return 'HAYATI'

    # 5. PUPUK CAIR
    if any(k in name_upper for k in ['GROMINO', 'ORMONA', 'MINOGEN', 'PUPUK CAIR', 'LIQUID', 'CAIR']):
        return 'PUPUK CAIR'

    # 6. ORGANIC
    if any(k in name_upper for k in ['HUMIC', 'HUMIGROW', 'HUMMER', 'HUMACOAT', 'ORGANIC', 'ORGANIK', 'SOIL']):
        return 'ORGANIC'

    # 7. MAKRO
    if ('NPK' in name_upper or 'MAKRO' in name_upper or 'MACRO' in name_upper or 'UREA' in name_upper or 'KCL' in name_upper or 'DAP' in name_upper):
        return 'MAKRO'

    # 8. MIKRO
    if any(k in name_upper for k in ['ZNCU', 'ZNB', 'ZNS', 'CUFE', 'LAKABA', 'MICBA', 'PALMIC', 'CHELATED', 'EDTA', 'FE 15%', 'MIKRO', 'MICRO', 'ZINC', 'TEMBAGA']):
        return 'MIKRO'

    # 9. Default fallback: TRADING
    return 'TRADING'


def get_product_category(item_name: str, item_code: Optional[str] = None) -> str:
    """
    Resolves product category matching Audited Finance Standards.
    Hybrid 4-Tier Resolution Engine:
    - Tier 1: Exact combination match (NamaBarang, KodeItem)
    - Tier 2: Specific SKU Code (KodeItem) match
    - Tier 3: Standardized NamaBarang match
    - Tier 4: Heuristic keyword / regex fallback
    - Tier 5: Default fallback to TRADING
    """
    reg_combo, reg_sku, reg_name = _init_registry()

    norm_name = ' '.join((item_name or '').strip().lower().split())
    norm_code = (item_code or '').strip().upper()

    # Tier 1: Exact combination match (NamaBarang, KodeItem)
    if norm_code and (norm_name, norm_code) in reg_combo:
        return reg_combo[(norm_name, norm_code)]

    # Tier 2: Specific SKU Code match
    if norm_code and norm_code in reg_sku:
        return reg_sku[norm_code]

    # Tier 3: Standardized Name match
    if norm_name in reg_name:
        return reg_name[norm_name]

    # Tier 4: Heuristic fallback based on chemical / product keywords
    return infer_fallback_category(item_name, item_code)


def get_category_color(category_name: str) -> str:
    if not category_name:
        return '#64748B'
    norm = category_name.strip().upper()
    for k, v in CATEGORY_COLORS.items():
        if k.upper() == norm:
            return v
    return '#64748B'
