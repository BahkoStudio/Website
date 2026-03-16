#!/usr/bin/env node
/**
 * competitor_research.js
 * Söker konkurrenter via Perplexity API + SerpAPI för social media data.
 * Output: .tmp/research_raw.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BRAND_FILE = join(ROOT, "brand", "brand.json");
const OUTPUT_FILE = join(ROOT, ".tmp", "research_raw.json");
const ENV_FILE = join(ROOT, ".env");

// ── .env ─────────────────────────────────────────────────────────────────────
function loadEnv() {
  if (!existsSync(ENV_FILE)) return;
  for (const line of readFileSync(ENV_FILE, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...v] = t.split("=");
    process.env[k.trim()] ??= v.join("=").trim();
  }
}

// ── Perplexity ────────────────────────────────────────────────────────────────
async function askPerplexity(query, apiKey) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "Du är en affärsanalytiker specialiserad på den svenska digitala byrå-marknaden. Svara på svenska. Var konkret och faktabaserad med specifika namn, siffror och exempel.",
        },
        { role: "user", content: query },
      ],
      max_tokens: 2500,
      temperature: 0.2,
      search_recency_filter: "month",
    }),
  });
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()).choices[0].message.content;
}

// ── SerpAPI ───────────────────────────────────────────────────────────────────
async function serpSearch(query, apiKey, num = 10) {
  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    hl: "sv",
    gl: "se",
    num: String(num),
  });
  const res = await fetch(`https://serpapi.com/search?${params}`);
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
  const data = await res.json();
  return (data.organic_results || []).map(r => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
  }));
}

// ── Hämta Instagram/social via SerpAPI ──────────────────────────────────────
async function getSocialResults(apiKey) {
  const queries = [
    "svenska webbyrå digital byrå instagram followers kliniker estetik",
    'site:instagram.com "webbyrå" OR "digital byrå" Sverige kliniker',
    "webbbyrå SEO reklam Sverige instagram linkedin konto",
  ];
  const allResults = [];
  for (const q of queries) {
    try {
      console.log(`   SerpAPI: "${q.slice(0, 50)}..."`);
      const results = await serpSearch(q, apiKey, 10);
      allResults.push(...results);
    } catch (e) {
      console.warn(`   SerpAPI varning: ${e.message}`);
    }
  }
  // Dedup by link
  const seen = new Set();
  return allResults.filter(r => {
    if (seen.has(r.link)) return false;
    seen.add(r.link); return true;
  });
}

// ── Competitor search via SerpAPI ─────────────────────────────────────────────
async function getCompetitorResults(apiKey) {
  const queries = [
    "digital byrå hemsidor SEO reklam kliniker Sverige",
    "webbyrå estetisk klinik skönhetsklinik hemsida Sverige",
    "SEO byrå Google Ads hälsa klinik Stockholm Göteborg",
  ];
  const allResults = [];
  for (const q of queries) {
    try {
      console.log(`   SerpAPI: "${q.slice(0, 50)}..."`);
      const results = await serpSearch(q, apiKey, 10);
      allResults.push(...results);
    } catch (e) {
      console.warn(`   SerpAPI varning: ${e.message}`);
    }
  }
  const seen = new Set();
  return allResults.filter(r => {
    if (seen.has(r.link)) return false;
    seen.add(r.link); return true;
  });
}

// ── Perplexity queries ────────────────────────────────────────────────────────
function buildQueries(brand) {
  const services = (brand.services || []).join(", ");
  const target = brand.target_market || "kliniker i Sverige";

  return [
    {
      id: "landscape",
      label: "Marknadsöversikt",
      query: `Lista de 10 mest framstående digitala byråerna i Sverige som erbjuder ${services} till ${target}. För varje byrå: namn, webbplats, specialitet, styrkor och ungefärliga priser. Fokus 2024-2025.`,
    },
    {
      id: "pricing",
      label: "Prisanalys",
      query: `Vad kostar det att anlita en digital byrå i Sverige för ${services}? Konkreta prisintervall (SEK) för: 1) Hemsida/landningssida, 2) SEO per månad, 3) Google Ads management, 4) Paketpris. Nämn byrånamn. 2024-2025.`,
    },
    {
      id: "clinic_niche",
      label: "Klinik-nischen",
      query: `Vilka digitala byråer i Sverige specialiserar sig på kliniker, skönhetssalonger och estetiska kliniker? Nämn specifika byråer, deras erbjudande och priser. Hur marknadsför estetiska kliniker sig online i Sverige 2025?`,
    },
    {
      id: "positioning",
      label: "Positionering & gaps",
      query: `Analysera positioneringen hos svenska digitala byråer för ${target}. Vilka nischer är underservade? Vad saknar kunderna? Vilka differentieringsfaktorer är viktigast för en ny byrå 2025?`,
    },
    {
      id: "social_media",
      label: "Social Media & Konkurrenter",
      query: `Lista svenska digitala byråer och webbbyråer med aktiva Instagram- eller LinkedIn-konton med minst 1000 följare. För varje: kontonamn, plattform, ungefärligt följarantal, typ av innehåll de postar och vilken strategi de verkar använda. Fokus på byråer som riktar sig mot hälsa, kliniker eller B2B 2024-2025.`,
    },
    {
      id: "competitor_offers",
      label: "Konkurrenternas erbjudanden",
      query: `Vad säljer svenska webbbyråer och digitala byråer konkret till kliniker och hälsoföretag? Lista specifika paket, prismodeller (engång vs månadsavgift), vad som ingår och vilka resultat de lovar. Nämn byrånamn. Sverige 2024-2025.`,
    },
    {
      id: "opportunities",
      label: "Möjligheter",
      query: `Vilka är de största möjligheterna för en ny digital byrå i Sverige fokuserad på ${target} med tjänsterna ${services}? Vilka konkurrensfördelar är realistiska? Hur kan man ta marknadsandelar 2025?`,
    },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const perplexityKey = process.env.PERPLEXITY_API_KEY || "";
  const serpKey = process.env.SERPAPI_KEY || "";

  if (!perplexityKey || perplexityKey === "din_nyckel_här") {
    console.error("❌ Ingen Perplexity API-nyckel i .env");
    process.exit(1);
  }

  const brand = JSON.parse(readFileSync(BRAND_FILE, "utf-8"));
  console.log(`✅ Brand: ${brand.company_name}`);
  console.log(`✅ SerpAPI: ${serpKey ? "aktiv" : "saknas (hoppar över Google-sökningar)"}`);

  const results = {
    generated_at: new Date().toISOString(),
    brand,
    research: {},
    serp_results: {},
  };

  // SerpAPI: social media + competitor searches
  if (serpKey) {
    console.log("\n📡 Söker via SerpAPI...");
    try {
      console.log(" [1/2] Social media-konton...");
      results.serp_results.social = await getSocialResults(serpKey);
      console.log(`   ✅ ${results.serp_results.social.length} resultat`);
    } catch (e) {
      console.error(`   ❌ ${e.message}`);
      results.serp_results.social = [];
    }
    try {
      console.log(" [2/2] Konkurrenter...");
      results.serp_results.competitors = await getCompetitorResults(serpKey);
      console.log(`   ✅ ${results.serp_results.competitors.length} resultat`);
    } catch (e) {
      console.error(`   ❌ ${e.message}`);
      results.serp_results.competitors = [];
    }
  }

  // Perplexity: deep analysis
  const queries = buildQueries(brand);
  console.log(`\n🤖 Researchar via Perplexity (${queries.length} frågor)...`);

  // Build context from SERP results to include in analysis
  const serpContext = serpKey && results.serp_results.competitors?.length
    ? `\n\nGooglesökresultat att utgå ifrån:\n${results.serp_results.competitors.slice(0, 8).map(r => `- ${r.title}: ${r.snippet} (${r.link})`).join("\n")}`
    : "";

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n[${i + 1}/${queries.length}] ${q.label}...`);
    try {
      const answer = await askPerplexity(q.query + serpContext, perplexityKey);
      results.research[q.id] = { label: q.label, query: q.query, answer };
      console.log(`   ✅ ${answer.length} tecken`);
    } catch (e) {
      console.error(`   ❌ ${e.message}`);
      results.research[q.id] = { label: q.label, query: q.query, answer: `FEL: ${e.message}` };
    }
    // Small delay to avoid rate limiting
    if (i < queries.length - 1) await new Promise(r => setTimeout(r, 800));
  }

  mkdirSync(join(ROOT, ".tmp"), { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n✅ Research sparad: ${OUTPUT_FILE}`);
  console.log("   Kör nu: node tools/generate_report.js");
}

main().catch(e => { console.error("Fel:", e); process.exit(1); });
