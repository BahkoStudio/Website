"""
competitor_research.py
Söker upp och analyserar konkurrenter via Perplexity API.
Output: .tmp/research_raw.json
"""

import os
import json
import sys
import requests
from datetime import datetime
from pathlib import Path

# ── Sökvägar ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
BRAND_FILE = ROOT / "brand" / "brand.json"
OUTPUT_FILE = ROOT / ".tmp" / "research_raw.json"
ENV_FILE = ROOT / ".env"

# ── Ladda .env manuellt (undviker beroende av python-dotenv) ────────────────
def load_env():
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

# ── Perplexity API-anrop ────────────────────────────────────────────────────
def ask_perplexity(query: str, api_key: str) -> str:
    """Skickar en fråga till Perplexity och returnerar svaret som text."""
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "sonar",
        "messages": [
            {
                "role": "system",
                "content": (
                    "Du är en affärsanalytiker som specialiserar sig på den svenska digitala byrå-marknaden. "
                    "Svara alltid på svenska. Var konkret, faktabaserad och strukturerad. "
                    "Fokusera på verifierbara fakta om svenska byråer."
                ),
            },
            {"role": "user", "content": query},
        ],
        "max_tokens": 2000,
        "temperature": 0.2,
        "search_recency_filter": "month",
        "return_citations": True,
    }
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


# ── Queries ─────────────────────────────────────────────────────────────────
def build_queries(brand: dict) -> list[dict]:
    services_str = ", ".join(brand.get("services", []))
    target = brand.get("target_market", "kliniker i Sverige")
    return [
        {
            "id": "landscape",
            "label": "Marknadsöversikt",
            "query": (
                f"Lista de 10 mest framstående digitala byråerna i Sverige som erbjuder {services_str} "
                f"till {target}. För varje byrå: namn, webbplats, ungefärliga priser, "
                f"specialitet och styrkor. Fokusera på byråer aktiva 2024-2025."
            ),
        },
        {
            "id": "pricing",
            "label": "Prisanalys",
            "query": (
                f"Vad kostar det att anlita en digital byrå i Sverige för {services_str}? "
                "Ge konkreta prisintervall (SEK) för: "
                "1) Hemsida/landningssida (engångskostnad), "
                "2) SEO per månad, "
                "3) Google Ads management per månad, "
                "4) Paketpris allt-i-ett. "
                "Basera på verkliga svenska byråer 2024-2025."
            ),
        },
        {
            "id": "positioning",
            "label": "Positionering & gaps",
            "query": (
                f"Analysera hur svenska digitala byråer positionerar sig på marknaden för {target}. "
                "Vilka positioneringsstrategier används? "
                "Vilka nischer är underservade? "
                "Vad saknar kunderna hos befintliga byråer? "
                "Vilka differentieringsfaktorer är viktigast?"
            ),
        },
        {
            "id": "clinic_niche",
            "label": "Klinik-nischen specifikt",
            "query": (
                "Vilka digitala byråer i Sverige specialiserar sig på kliniker, skönhetssalonger "
                "och estetiska kliniker? Finns det byråer som fokuserar specifikt på denna nisch? "
                "Vad är deras erbjudande och priser? "
                "Hur marknadsför sig estetiska kliniker online i Sverige 2024-2025?"
            ),
        },
        {
            "id": "opportunities",
            "label": "Möjligheter",
            "query": (
                f"Vad är de största möjligheterna för en ny digital byrå i Sverige som fokuserar på "
                f"{target} och erbjuder {services_str}? "
                "Vilka konkurrensfördelar är möjliga? "
                "Vad efterfrågar kliniker och skönhetskliniker online? "
                "Hur kan en byrå differentiera sig och ta marknadsandelar?"
            ),
        },
    ]


# ── Huvud ───────────────────────────────────────────────────────────────────
def main():
    load_env()

    api_key = os.environ.get("PERPLEXITY_API_KEY", "")
    if not api_key or api_key == "din_nyckel_här":
        print("❌ Ingen Perplexity API-nyckel hittad.")
        print("   Öppna .env och fyll i: PERPLEXITY_API_KEY=din_nyckel_här")
        print("   Skaffa nyckel på: https://www.perplexity.ai/settings/api")
        sys.exit(1)

    if not BRAND_FILE.exists():
        print(f"❌ Hittade inte brand.json på: {BRAND_FILE}")
        sys.exit(1)

    brand = json.loads(BRAND_FILE.read_text(encoding="utf-8"))
    print(f"✅ Laddat brand: {brand.get('company_name')}")

    queries = build_queries(brand)
    results = {
        "generated_at": datetime.now().isoformat(),
        "brand": brand,
        "research": {},
    }

    for i, q in enumerate(queries, 1):
        print(f"\n[{i}/{len(queries)}] Researchar: {q['label']}...")
        try:
            answer = ask_perplexity(q["query"], api_key)
            results["research"][q["id"]] = {
                "label": q["label"],
                "query": q["query"],
                "answer": answer,
            }
            print(f"   ✅ Klart ({len(answer)} tecken)")
        except requests.HTTPError as e:
            print(f"   ❌ HTTP-fel: {e}")
            results["research"][q["id"]] = {
                "label": q["label"],
                "query": q["query"],
                "answer": f"FEL: {e}",
            }
        except Exception as e:
            print(f"   ❌ Oväntat fel: {e}")
            results["research"][q["id"]] = {
                "label": q["label"],
                "query": q["query"],
                "answer": f"FEL: {e}",
            }

    OUTPUT_FILE.parent.mkdir(exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ Research sparad till: {OUTPUT_FILE}")
    print("   Kör nu: python tools/generate_report.py")


if __name__ == "__main__":
    main()
